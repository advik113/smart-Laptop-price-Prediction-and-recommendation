import http.server
import socketserver
import webbrowser
import threading
import time
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser():
    time.sleep(1.0)
    print(f"\n[Server] Opening browser at http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    # Start a background thread to open the web browser after server starts
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start HTTP server
    print(f"[Server] Starting server on http://localhost:{PORT} ...")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[Server] Serving files from: {DIRECTORY}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[Server] Server stopped by user.")
