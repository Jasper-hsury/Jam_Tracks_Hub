import asyncio
import sys
import unittest
from pathlib import Path

from fastapi import Request
from fastapi.responses import JSONResponse


API_SERVER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_SERVER_ROOT))

import app  # noqa: E402


def request_for(method="GET", path="/api/health", headers=None):
    encoded_headers = [
        (name.lower().encode("latin-1"), value.encode("latin-1"))
        for name, value in (headers or {}).items()
    ]
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "https",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": b"",
            "headers": encoded_headers,
            "client": ("127.0.0.1", 12345),
            "server": ("api.jamtrackshub.com", 443),
        }
    )


class CorsPolicyTests(unittest.TestCase):
    def test_origin_allowlist(self):
        self.assertTrue(app.is_allowed_cors_origin("https://jamtrackshub.com"))
        self.assertTrue(app.is_allowed_cors_origin("http://localhost:5500"))
        self.assertTrue(app.is_allowed_cors_origin("http://127.0.0.1:8000"))
        self.assertFalse(app.is_allowed_cors_origin("https://www.jamtrackshub.com"))
        self.assertFalse(app.is_allowed_cors_origin("https://evil.example"))
        self.assertFalse(app.is_allowed_cors_origin("null"))

    def test_private_network_preflight_is_bounded(self):
        async def unused_call_next(_request):
            raise AssertionError("preflight must not reach the application")

        allowed = request_for(
            method="OPTIONS",
            path="/api/analyze/jobs",
            headers={
                "Origin": "http://localhost:5500",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
                "Access-Control-Request-Private-Network": "true",
            },
        )
        response = asyncio.run(app.add_private_network_access_header(allowed, unused_call_next))
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5500")
        self.assertEqual(response.headers["access-control-allow-private-network"], "true")

        rejected = request_for(
            method="OPTIONS",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Private-Network": "true",
            },
        )
        response = asyncio.run(app.add_private_network_access_header(rejected, unused_call_next))
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_api_responses_are_no_store(self):
        async def json_response(_request):
            return JSONResponse({"status": "ok"})

        response = asyncio.run(
            app.add_private_network_access_header(
                request_for(path="/api/health"),
                json_response,
            )
        )
        self.assertEqual(response.headers["cache-control"], "no-store")


if __name__ == "__main__":
    unittest.main()
