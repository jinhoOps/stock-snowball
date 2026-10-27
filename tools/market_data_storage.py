"""Immutable, verified market-data releases in Supabase Storage."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from tools.market_data import ASSETS, MarketDataError, validate_generated_data, validate_historical_date_preservation

BUCKET = 'stock-snowball-market-data'
LATEST = 'v1/latest.json'
FILENAMES = {'manifest.json', *(asset.output_filename for asset in ASSETS)}
LIMITS = {'pointer': 8192, 'release': 262144, 'file': 6 * 1024 * 1024, 'total': 30 * 1024 * 1024}

class StorageError(MarketDataError):
    def __init__(self, message, *, status=None):
        super().__init__(message)
        self.status = status

def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')

def sha256(payload):
    return hashlib.sha256(payload).hexdigest()

def check_release_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', value):
        raise StorageError('Invalid release ID')
    return value

def check_timestamp(value):
    from datetime import datetime
    if not isinstance(value, str) or not value.endswith('Z'):
        raise StorageError('Invalid publication timestamp')
    try: datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError: raise StorageError('Invalid publication timestamp') from None

def decode(payload, limit):
    if len(payload) > limit: raise StorageError('JSON size limit exceeded')
    try: return json.loads(payload)
    except (ValueError, UnicodeDecodeError): raise StorageError('Invalid release JSON') from None

def validate_ref(ref):
    if not isinstance(ref, dict): raise StorageError('Invalid release reference')
    check_release_id(ref.get('releaseId'))
    check_timestamp(ref.get('publishedAt'))
    if not re.fullmatch(r'[a-f0-9]{64}', str(ref.get('releaseSha256', ''))):
        raise StorageError('Invalid release hash')

def read_pointer(storage):
    pointer = decode(storage.get(LATEST), LIMITS['pointer'])
    if not isinstance(pointer, dict) or pointer.get('transportVersion') != 1:
        raise StorageError('Unsupported pointer version')
    validate_ref(pointer.get('current'))
    if 'previous' in pointer: validate_ref(pointer['previous'])
    return pointer

def build_release_manifest(data_dir: Path, release_id: str, published_at: str):
    check_release_id(release_id); check_timestamp(published_at)
    files = {}
    for name in sorted(FILENAMES):
        payload = (data_dir / name).read_bytes()
        if len(payload) > LIMITS['file']: raise StorageError('Data file size limit exceeded')
        files[name] = {'bytes': len(payload), 'sha256': sha256(payload)}
    if sum(item['bytes'] for item in files.values()) > LIMITS['total']:
        raise StorageError('Catalog size limit exceeded')
    manifest = json.loads((data_dir / 'manifest.json').read_text())
    fingerprint = {key: manifest[key] for key in ('schemaVersion', 'source', 'assets')}
    fingerprint['csvHashes'] = {name: files[name]['sha256'] for name in sorted(FILENAMES) if name != 'manifest.json'}
    return {'transportVersion': 1, 'releaseId': release_id, 'publishedAt': published_at,
            'dataHash': sha256(encoded(fingerprint)), 'files': files}

def read_release(storage, ref):
    validate_ref(ref)
    prefix = 'v1/releases/' + ref['releaseId'] + '/'
    payload = storage.get(prefix + 'release.json')
    if sha256(payload) != ref['releaseSha256']: raise StorageError('Release hash mismatch')
    release = decode(payload, LIMITS['release'])
    if not isinstance(release, dict) or release.get('transportVersion') != 1 or release.get('releaseId') != ref['releaseId'] or release.get('publishedAt') != ref['publishedAt']:
        raise StorageError('Release metadata mismatch')
    if not isinstance(release.get('files'), dict) or set(release['files']) != FILENAMES:
        raise StorageError('Release file membership mismatch')
    if not re.fullmatch(r'[a-f0-9]{64}', str(release.get('dataHash', ''))): raise StorageError('Invalid data hash')
    total = 0
    for item in release['files'].values():
        if not isinstance(item, dict) or type(item.get('bytes')) is not int or not 0 < item['bytes'] <= LIMITS['file'] or not re.fullmatch(r'[a-f0-9]{64}', str(item.get('sha256', ''))):
            raise StorageError('Invalid file descriptor')
        total += item['bytes']
    if total > LIMITS['total']: raise StorageError('Catalog size limit exceeded')
    return release

def download_release(storage, ref, target_dir):
    release = read_release(storage, ref)
    prefix = 'v1/releases/' + ref['releaseId'] + '/'
    target_dir.mkdir(parents=True, exist_ok=True)
    for name, item in release['files'].items():
        payload = storage.get(prefix + name)
        if len(payload) != item['bytes'] or sha256(payload) != item['sha256']:
            raise StorageError('Data hash mismatch: ' + name)
        try: payload.decode('utf-8', errors='strict')
        except UnicodeDecodeError: raise StorageError('Invalid UTF-8: ' + name) from None
        (target_dir / name).write_bytes(payload)
    validate_generated_data(target_dir, provenance_policy='recorded')
    return release

def load_remote_catalog(storage, target_dir: Path):
    pointer = read_pointer(storage)
    download_release(storage, pointer['current'], target_dir)
    return pointer

def current_data_hash(storage, pointer):
    return read_release(storage, pointer['current'])['dataHash'] if pointer else None

def write_latest_pointer(storage, pointer):
    payload = encoded(pointer)
    try:
        storage.put(LATEST, payload, content_type='application/json', cache_seconds=60, overwrite=True)
    except StorageError:
        # Authenticated reads bypass the public CDN's old-pointer cache.
        if read_pointer(storage) != pointer: raise

def ensure_publication_marker(storage, ref):
    path='v1/releases/'+ref['releaseId']+'/published.json'
    try:
        if decode(storage.get(path),LIMITS['pointer']) != ref: raise StorageError('Publication marker mismatch')
    except StorageError as error:
        if error.status != 404: raise
        storage.put(path,encoded(ref),content_type='application/json',cache_seconds=31536000,overwrite=False)

def publish_catalog(storage, data_dir: Path, release_id: str, published_at: str, *, bootstrap=False):
    check_release_id(release_id)
    validate_generated_data(data_dir)
    try: previous = read_pointer(storage)
    except StorageError as error:
        if error.status != 404: raise
        previous = None
    if bootstrap and previous: raise StorageError('Bootstrap requires an empty destination')
    # No implicit reset after a transient 404; only explicit bootstrap may create it.
    if previous is None and not bootstrap:
        raise StorageError('No baseline: explicit bootstrap is required', status=404)
    release = build_release_manifest(data_dir, release_id, published_at)
    if release['dataHash'] == current_data_hash(storage, previous):
        ensure_publication_marker(storage, previous['current'])
        return None
    if previous:
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            baseline = Path(directory) / 'baseline'
            download_release(storage, previous['current'], baseline)
            validate_historical_date_preservation(baseline, data_dir)
    prefix = 'v1/releases/' + release_id + '/'
    for name in sorted(FILENAMES):
        storage.put(prefix + name, (data_dir/name).read_bytes(), content_type='application/json' if name.endswith('.json') else 'text/csv', cache_seconds=31536000, overwrite=False)
    payload = encoded(release)
    storage.put(prefix + 'release.json', payload, content_type='application/json', cache_seconds=31536000, overwrite=False)
    for name, item in {**release['files'], 'release.json': {'bytes': len(payload), 'sha256': sha256(payload)}}.items():
        public = storage.get_public(prefix + name)
        if len(public) != item['bytes'] or sha256(public) != item['sha256']: raise StorageError('Public verification failed: ' + name)
    pointer = {'transportVersion': 1, 'current': {'releaseId': release_id, 'publishedAt': published_at, 'releaseSha256': sha256(payload)}}
    if previous: pointer['previous'] = previous['current']
    write_latest_pointer(storage, pointer)
    ensure_publication_marker(storage, pointer["current"])
    return pointer

def rollback_catalog(storage, release_id):
    import tempfile
    check_release_id(release_id)
    previous = read_pointer(storage)
    payload = storage.get('v1/releases/' + release_id + '/release.json')
    release = decode(payload, LIMITS['release'])
    ref = {'releaseId': release_id, 'publishedAt': release.get('publishedAt'), 'releaseSha256': sha256(payload)}
    with tempfile.TemporaryDirectory() as directory:
        download_release(storage, ref, Path(directory))
    pointer = {'transportVersion': 1, 'current': ref, 'previous': previous['current']}
    write_latest_pointer(storage, pointer)
    ensure_publication_marker(storage, pointer["current"])
    return pointer

def cleanup_releases(storage, keep=10):
    pointer = read_pointer(storage)
    protected = {pointer['current']['releaseId']}
    if pointer.get('previous'): protected.add(pointer['previous']['releaseId'])
    paths = storage.list('v1/releases/')
    ids = {path.split('/')[2] for path in paths if len(path.split('/')) == 4}
    complete=[]
    for ident in ids:
        marker='v1/releases/'+ident+'/published.json'
        if marker not in paths:
            if ident in protected: raise StorageError('Protected release lacks publication marker; cleanup deferred')
            continue
        ref=decode(storage.get(marker),LIMITS['pointer']);validate_ref(ref)
        if ref['releaseId'] != ident: raise StorageError('Publication marker ID mismatch')
        release=read_release(storage,ref)
        if any('v1/releases/'+ident+'/'+name not in paths for name in release['files']):
            raise StorageError('Published release is incomplete; cleanup deferred')
        complete.append(ref)
    complete.sort(key=lambda ref:ref['publishedAt'],reverse=True)
    protected.update(ref['releaseId'] for ref in complete[:keep])
    storage.delete([path for path in paths if path.split('/')[2] not in protected])


class StorageClient:
    def __init__(self, url, key):
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname != 'olqdftjssrzqvcindekh.supabase.co':
            raise StorageError('Unexpected Supabase project URL')
        if not key: raise StorageError('Missing SUPABASE_SERVICE_ROLE_KEY')
        self.base = url.rstrip('/') + '/storage/v1'
        self.key = key
    def request(self, route, *, method='GET', payload=None, headers=None, public=False, limit=LIMITS['file']):
        auth = {} if public else {'Authorization': 'Bearer ' + self.key, 'apikey': self.key}
        request = Request(self.base + route, data=payload, method=method, headers={**auth, **(headers or {})})
        try:
            with urlopen(request, timeout=30) as response:
                data = response.read(limit + 1)
                if len(data) > limit: raise StorageError('HTTP response size limit exceeded')
                return data
        except HTTPError as error:
            # Never expose response bodies or request headers containing credentials.
            status=error.code
            try:
                detail=json.loads(error.read(8192))
                if status==400 and str(detail.get('statusCode')) in ('401','403','404','409','413'): status=int(detail['statusCode'])
            except (ValueError, OSError): pass
            raise StorageError('Storage HTTP ' + str(status), status=status) from None
        except (URLError, TimeoutError): raise StorageError('Storage connection failed') from None
    def get(self, path):
        import uuid
        nonce='?cacheNonce='+uuid.uuid4().hex if path==LATEST else ''
        return self.request('/object/authenticated/' + BUCKET + '/' + quote(path, safe='/') + nonce, headers={'Cache-Control':'no-cache'})
    def get_public(self, path):
        return self.request('/object/public/' + BUCKET + '/' + quote(path, safe='/'), public=True)
    def put(self, path, payload, *, content_type, cache_seconds, overwrite):
        try:
            self.request('/object/' + BUCKET + '/' + quote(path, safe='/'), method='POST', payload=payload,
                         headers={'Content-Type': content_type, 'Cache-Control': 'max-age=' + str(cache_seconds), 'x-upsert': str(overwrite).lower()})
        except StorageError as error:
            if overwrite or error.status != 409 or self.get(path) != payload: raise
    def list(self, prefix):
        # Storage listing is hierarchical; paginate both release folders and objects.
        def members(folder):
            result=[]; offset=0
            while True:
                rows=decode(self.request('/object/list/' + BUCKET, method='POST', payload=encoded({'prefix':folder,'limit':100,'offset':offset}), headers={'Content-Type':'application/json'}), LIMITS['file'])
                result.extend(rows)
                if len(rows)<100: return result
                offset+=len(rows)
        folders=members(prefix.rstrip('/'))
        return [prefix + folder['name'] + '/' + item['name'] for folder in folders for item in members(prefix + folder['name'])]
    def delete(self, paths):
        if paths: self.request('/object/' + BUCKET, method='DELETE', payload=encoded({'prefixes':paths}), headers={'Content-Type':'application/json'})
