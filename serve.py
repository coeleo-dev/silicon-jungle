#!/usr/bin/env python3
"""
Servidor de desenvolvimento SEM CACHE para The Silicon Jungle.

Uso:
    python3 serve.py
    # abra http://localhost:8000

Por quê: os módulos ES (js/*.js) são importados por URL fixa. Com
`python3 -m http.server`, o navegador os cacheia de forma agressiva,
causando o erro "does not provide an export named 'PBR_MATERIALS'"
após qualquer mudança de código (serve módulos velhos misturados).
Este handler desliga o cache: cada F5 traz a versão mais nova.
"""
import http.server
import socketserver

PORT = 4321


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
        print(f'[The Silicon Jungle] Servindo sem cache em http://localhost:{PORT}')
        print('Recarregue com F5 — não precisa mais de Ctrl+Shift+R.')
        httpd.serve_forever()
