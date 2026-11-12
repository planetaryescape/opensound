import json
import pathlib
import subprocess
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


INSTALLER = pathlib.Path(__file__).resolve().parents[1] / "install.sh"
ASSET = "gbpm-linux-x86_64.tar.gz"


def release(tag, url, **flags):
    return {
        "tag_name": tag,
        "draft": False,
        "prerelease": False,
        "assets": [{"name": ASSET, "browser_download_url": url}],
        **flags,
    }


class InstallerTests(unittest.TestCase):
    def resolve(self, pages, status=200):
        requested = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                parsed = urlparse(self.path)
                page = int(parse_qs(parsed.query)["page"][0])
                requested.append(page)
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(pages.get(page, [])).encode())

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            result = subprocess.run(
                [
                    "bash", "-c", 'source "$1"; get_latest_url "$2" "$3"',
                    "bash", str(INSTALLER), "gbpm-linux-x86_64",
                    f"http://127.0.0.1:{server.server_port}",
                ],
                text=True, capture_output=True, timeout=10,
            )
            return result, requested
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_paginates_past_sdk_draft_and_prerelease_assets(self):
        result, requested = self.resolve({
            1: [
                release("spotify-v9.0.0", "https://example.test/sdk"),
                release("gbpm-v0.3.0", "https://example.test/draft", draft=True),
                release("gbpm-v0.2.0-rc.1", "https://example.test/rc", prerelease=True),
            ],
            2: [release("gbpm-v0.1.0", "https://example.test/stable")],
        })
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "https://example.test/stable")
        self.assertEqual(requested, [1, 2])

    def test_stops_when_no_matching_release_exists(self):
        result, requested = self.resolve({1: [release("sdk-v1", "https://example.test/sdk")]})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no stable gbpm release", result.stderr)
        self.assertEqual(requested, [1, 2])

    def test_http_failure_does_not_retry_or_loop(self):
        result, requested = self.resolve({1: {"message": "unavailable"}}, status=503)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(requested, [1])

    def test_invalid_success_payload_fails_closed(self):
        result, requested = self.resolve({1: {"message": "invalid response"}})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(requested, [1])


if __name__ == "__main__":
    unittest.main()
