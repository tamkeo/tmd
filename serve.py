from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        try:
            msg = format % args
            if 'images/' not in msg:
                sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), msg))
        except Exception:
            pass

    def translate_path(self, path):
        clean_path = path.split('?')[0].split('#')[0]
        if clean_path.startswith('/hinh_ctp/'):
            filename = clean_path[len('/hinh_ctp/'):]
            return os.path.join(r"D:\hinh CTP", filename)
        return super().translate_path(path)

server = ThreadingHTTPServer(('0.0.0.0', 8089), Handler)
print("Threading server listening on port 8089", flush=True)
server.serve_forever()
