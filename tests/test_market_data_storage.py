from __future__ import annotations
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from tools.market_data_storage import (
    StorageError, build_release_manifest, publish_catalog, load_remote_catalog,
    rollback_catalog, cleanup_releases,
)

DATA = Path(__file__).resolve().parents[1] / 'src/data/indices'

class FakeStorage:
    def __init__(self):
        self.objects = {}
        self.fail_path = None
        self.lose_reply = False
        self.puts = 0
    def get(self, path):
        if path not in self.objects:
            raise StorageError('Not found', status=404)
        return self.objects[path]
    def get_public(self, path):
        return self.get(path)
    def put(self, path, payload, **kwargs):
        self.puts += 1
        if path == self.fail_path:
            raise StorageError('Simulated interruption')
        if path in self.objects and not kwargs.get('overwrite', False):
            if self.objects[path] != payload:
                raise StorageError('Immutable object conflict')
            return
        self.objects[path] = payload
        if path == 'v1/latest.json' and self.lose_reply:
            raise StorageError('Response lost after write')
    def list(self, prefix):
        return [key for key in self.objects if key.startswith(prefix)]
    def delete(self, paths):
        for path in paths: self.objects.pop(path, None)

class StorageTests(unittest.TestCase):
    def setUp(self):
        self.storage = FakeStorage()
    def publish(self, release='fixture-one'):
        return publish_catalog(self.storage, DATA, release, '2026-10-26T01:17:00Z', bootstrap='v1/latest.json' not in self.storage.objects)
    def test_publish_verifies_and_can_download_full_catalog(self):
        self.publish()
        with tempfile.TemporaryDirectory() as directory:
            pointer = load_remote_catalog(self.storage, Path(directory))
            self.assertEqual(pointer['current']['releaseId'], 'fixture-one')
            self.assertEqual((Path(directory)/'qqq.csv').read_bytes(), (DATA/'qqq.csv').read_bytes())
    def test_partial_upload_preserves_pointer(self):
        self.publish()
        before = self.storage.get('v1/latest.json')
        self.storage.fail_path = 'v1/releases/fixture-two/qqq.csv'
        with patch('tools.market_data_storage.current_data_hash', return_value='different'):
            with self.assertRaises(StorageError): self.publish('fixture-two')
        self.assertEqual(before, self.storage.get('v1/latest.json'))
    def test_hash_mismatch_rejects_baseline(self):
        self.publish()
        self.storage.objects['v1/releases/fixture-one/qqq.csv'] += b'corrupt'
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(StorageError): load_remote_catalog(self.storage, Path(directory))
    def test_identical_data_skips_publish(self):
        self.publish()
        puts = self.storage.puts
        self.assertIsNone(self.publish('fixture-two'))
        self.assertEqual(puts, self.storage.puts)
    def test_lost_pointer_write_response_is_reconciled(self):
        self.storage.lose_reply = True
        self.publish()
        self.assertEqual(json.loads(self.storage.get('v1/latest.json'))['current']['releaseId'], 'fixture-one')
    def test_rollback_verifies_and_restores_kept_version(self):
        self.publish()
        with patch('tools.market_data_storage.current_data_hash', return_value='different'):
            self.publish('fixture-two')
        rollback_catalog(self.storage, 'fixture-one')
        self.assertEqual(json.loads(self.storage.get('v1/latest.json'))['current']['releaseId'], 'fixture-one')
    def test_cleanup_protects_current_and_previous(self):
        self.publish()
        self.storage.objects['v1/releases/old-orphan/qqq.csv'] = b'partial'
        cleanup_releases(self.storage, keep=0)
        self.assertIn('v1/releases/fixture-one/qqq.csv', self.storage.objects)
        self.assertNotIn('v1/releases/old-orphan/qqq.csv', self.storage.objects)
    def test_rejects_unsafe_release_path(self):
        with self.assertRaises(StorageError): self.publish('../unsafe')
    def test_hash_ignores_generation_time_but_not_provenance(self):
        from shutil import copytree
        first = build_release_manifest(DATA, 'fixture-one', '2026-10-26T01:17:00Z')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'data'; copytree(DATA, path)
            manifest = json.loads((path/'manifest.json').read_text())
            manifest['generatedAt'] = '2026-10-25T00:00:00Z'
            (path/'manifest.json').write_text(json.dumps(manifest))
            second = build_release_manifest(path, 'fixture-two', '2026-10-26T01:17:00Z')
            self.assertEqual(first['dataHash'], second['dataHash'])

if __name__ == '__main__': unittest.main()

class RecordedProvenanceTests(unittest.TestCase):
    def test_older_recorded_gap_is_verified_against_its_own_approval(self):
        from shutil import copytree
        from tools.market_data import validate_generated_data
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'data';copytree(DATA,target)
            path=target/'qqq.csv';lines=path.read_text().splitlines()
            previous=lines[1].split(',')[0];following=lines[31].split(',')[0]
            path.write_text('\n'.join([lines[0],lines[1],*lines[31:]])+'\n')
            manifest=json.loads((target/'manifest.json').read_text());manifest['assets']['QQQ']['rowCount']-=29
            manifest['source']['reviewedDailyGapAllowances']=[{'assetId':'QQQ','previousDate':previous,'nextDate':following,'sourceUrl':'https://finance.yahoo.com/','retrievedAt':'2026-10-24T00:00:00Z','reason':'Reviewed historical gap'}]
            (target/'manifest.json').write_text(json.dumps(manifest))
            validate_generated_data(target,provenance_policy='recorded')
    def test_cleanup_does_not_count_abandoned_folders_as_successful_releases(self):
        storage=FakeStorage()
        from tools.market_data_storage import encoded
        for i in range(12):
            ident=f'202601{i:02d}'
            release=build_release_manifest(DATA,ident,f'2026-01-{i+1:02d}T01:17:00Z')
            payload=encoded(release)
            for name in release['files']: storage.objects['v1/releases/'+ident+'/'+name]=b'present'
            ref={'releaseId':ident,'publishedAt':f'2026-01-{i+1:02d}T01:17:00Z','releaseSha256':__import__('hashlib').sha256(payload).hexdigest()}
            storage.objects['v1/releases/'+ident+'/release.json']=payload
            storage.objects['v1/releases/'+ident+'/published.json']=encoded(ref)
        storage.objects['v1/latest.json']=encoded({'transportVersion':1,'current':ref})
        for i in range(15):storage.objects[f'v1/releases/9999-orphan-{i}/qqq.csv']=b'partial'
        cleanup_releases(storage)
        kept=[key for key in storage.objects if key.endswith('/published.json')]
        self.assertEqual(len(kept),10)

class StorageHttpBoundaryTests(unittest.TestCase):
    def test_legacy_http_400_with_storage_404_is_missing_not_transport_failure(self):
        from io import BytesIO
        from urllib.error import HTTPError
        from tools.market_data_storage import StorageClient
        response=HTTPError('https://example.invalid',400,'Bad Request',{},BytesIO(b'{"statusCode":"404","error":"not_found","message":"Object not found"}'))
        client=StorageClient('https://olqdftjssrzqvcindekh.supabase.co','test-only-key')
        with patch('tools.market_data_storage.urlopen',side_effect=response):
            with self.assertRaises(StorageError) as caught: client.get('v1/latest.json')
        self.assertEqual(caught.exception.status,404)

class ImmutableRetryTests(unittest.TestCase):
    def test_retry_of_an_already_uploaded_identical_object_is_idempotent(self):
        from io import BytesIO
        from urllib.error import HTTPError
        from tools.market_data_storage import StorageClient
        conflict=HTTPError('https://example.invalid',409,'Conflict',{},BytesIO(b'{}'))
        client=StorageClient('https://olqdftjssrzqvcindekh.supabase.co','test-only-key')
        with patch('tools.market_data_storage.urlopen',side_effect=[conflict,BytesIO(b'{}')]):
            client.put('v1/releases/test/manifest.json',b'{}',content_type='application/json',cache_seconds=31536000,overwrite=False)

class PointerFreshnessTests(unittest.TestCase):
    def test_authenticated_pointer_reads_bypass_cdn_cache_for_reconciliation(self):
        from io import BytesIO
        from tools.market_data_storage import StorageClient
        client=StorageClient('https://olqdftjssrzqvcindekh.supabase.co','test-only-key')
        with patch('tools.market_data_storage.urlopen',side_effect=[BytesIO(b'{}'),BytesIO(b'{}')]) as requests:
            client.get('v1/latest.json');client.get('v1/latest.json')
        urls=[call.args[0].full_url for call in requests.call_args_list]
        self.assertNotEqual(urls[0],urls[1])
