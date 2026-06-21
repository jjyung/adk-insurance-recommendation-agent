import os
import re

def main():
    html_path = "docs/index.html"
    
    # 1. Load SVG contents
    print("Loading compiled SVGs...")
    with open("docs/images/sse_flow.svg", "r", encoding="utf-8") as f:
        sse_svg = f.read().strip()
    with open("docs/images/live_flow.svg", "r", encoding="utf-8") as f:
        live_svg = f.read().strip()
    with open("docs/images/telemetry_flow.svg", "r", encoding="utf-8") as f:
        telemetry_svg = f.read().strip()
    with open("docs/images/deploy_flow.svg", "r", encoding="utf-8") as f:
        deploy_svg = f.read().strip()

    # 2. Load index.html
    print(f"Loading {html_path}...")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 3. Perform replacements
    # Let's replace the dynamic script loading of Mermaid
    old_mermaid_script = re.compile(
        r'<!--\s*Mermaid\.js\s+for\s+diagrams\s*-->\s*'
        r'<script\s+src="https://cdn\.jsdelivr\.net/npm/mermaid/dist/mermaid\.min\.js"></script>\s*'
        r'<script>mermaid\.initialize\({[^}]+}\);</script>',
        re.DOTALL
    )
    new_mermaid_script = '<!-- Pre-compiled Static SVGs for zero runtime overhead & crisp scaling -->'
    html, count = old_mermaid_script.subn(new_mermaid_script, html)
    print(f"Removed dynamic Mermaid script loading: {count} match(es)")

    # Find and replace Block 1 (SSE Flow)
    # <div class="mermaid">\s*sequenceDiagram\s*autonumber\s*actor Client as 前端瀏覽器 (UI)...</div>
    # We find the first <div class="mermaid"> ... </div> block and replace it
    pattern_mermaid_div = re.compile(r'<div class="mermaid">.*?</div>', re.DOTALL)
    
    # Find all mermaid divs currently in the HTML
    all_mermaid_divs = pattern_mermaid_div.findall(html)
    print(f"Found {len(all_mermaid_divs)} raw mermaid blocks in HTML.")

    # We have 4 blocks of mermaid:
    # 1. SSE Flow
    # 2. Live Flow
    # 3. Telemetry Flow (Inside a mermaid-container wrapper)
    # 4. Deploy Flow
    
    # Let's do replacements sequentially:
    # Replacement for SSE Flow: first occurrence of `<div class="mermaid">...</div>`
    html = pattern_mermaid_div.sub(f'<div class="mermaid-svg">{sse_svg}</div>', html, count=1)
    
    # Replacement for Live Flow: next occurrence of `<div class="mermaid">...</div>`
    html = pattern_mermaid_div.sub(f'<div class="mermaid-svg">{live_svg}</div>', html, count=1)

    # Replacement for Telemetry Flow:
    # The telemetry flow is wrapped inside:
    # <div class="mermaid-container">\s*<div class="mermaid">.*?</div>\s*</div>
    pattern_telemetry_wrapper = re.compile(
        r'<div class="mermaid-container">\s*<div class="mermaid">.*?</div>\s*</div>',
        re.DOTALL
    )
    html, count = pattern_telemetry_wrapper.subn(f'<div class="mermaid-svg">{telemetry_svg}</div>', html)
    print(f"Replaced wrapped Telemetry block: {count} match(es)")

    # Replacement for Deploy Flow:
    # This is the remaining `<div class="mermaid">...</div>` block in the HTML
    html, count = pattern_mermaid_div.subn(f'<div class="mermaid-svg">{deploy_svg}</div>', html, count=1)
    print(f"Replaced remaining Deploy block: {count} match(es)")

    # Update JS query selector in index.html
    html, count = re.subn(
        r"const\s+mermaidElements\s*=\s*document\.querySelectorAll\('div\.mermaid'\);",
        "const mermaidElements = document.querySelectorAll('div.mermaid-svg');",
        html
    )
    print(f"Updated JS selector: {count} match(es)")

    # Save modified HTML
    print(f"Saving changes back to {html_path}...")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
        
    print("Done! SVGs successfully inlined and index.html optimized.")

if __name__ == "__main__":
    main()
