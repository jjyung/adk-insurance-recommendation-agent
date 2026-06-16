#!/usr/bin/env python3
import os
import sys
import re
from datetime import datetime

def escape_html(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def parse_inline_markdown(text):
    # Escape some HTML chars first for safety in inline text (excluding already converted HTML elements)
    # But since we generate HTML tags, we do it carefully.
    
    # Inline code: `code`
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    
    # Bold: **bold** or __bold__
    text = re.sub(r'\*\*([^*]+)\*\*|__([^_]+)__', r'<strong>\1\2</strong>', text)
    
    # Italic: *italic* or _italic_
    text = re.sub(r'\*([^*]+)\*|_([^_]+)_', r'<em>\1\2</em>', text)
    
    # Links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    
    return text

def parse_markdown_to_html(markdown_text):
    # Step 1: Extract code blocks and replace with placeholders
    code_blocks = []
    
    def code_block_sub(match):
        lang = match.group(1) or ""
        code = match.group(2)
        placeholder = f"<!--CODE_BLOCK_{len(code_blocks)}-->"
        code_blocks.append((lang.strip().lower(), code))
        return placeholder

    # Matches ```lang ... ```
    markdown_text = re.sub(r'```(\w*)\n(.*?)\n```', code_block_sub, markdown_text, flags=re.DOTALL)

    # Step 2: Split content into paragraphs/blocks and parse line-by-line
    lines = markdown_text.split('\n')
    parsed_blocks = []
    
    in_list = False
    list_type = None # 'ul' or 'ol'
    list_items = []
    
    in_table = False
    table_rows = []
    
    in_quote = False
    quote_lines = []

    def flush_list():
        nonlocal in_list, list_type, list_items
        if in_list:
            items_html = "".join(f"<li>{parse_inline_markdown(item)}</li>" for item in list_items)
            parsed_blocks.append(f"<{list_type}>{items_html}</{list_type}>")
            in_list = False
            list_items = []
            list_type = None

    def flush_table():
        nonlocal in_table, table_rows
        if in_table:
            # We have table_rows as list of lists of cells
            if len(table_rows) > 0:
                html = ['<table class="codelab-table">']
                # Check if second row is separator (contains only dashes, colons, spaces)
                has_header = False
                header_cells = table_rows[0]
                rows_start = 0
                
                if len(table_rows) > 1:
                    second_row = table_rows[1]
                    is_separator = all(re.match(r'^[:\s-]*$', cell) for cell in second_row)
                    if is_separator:
                        has_header = True
                        rows_start = 2
                
                if has_header:
                    html.append("<thead><tr>")
                    for cell in header_cells:
                        html.append(f"<th>{parse_inline_markdown(cell.strip())}</th>")
                    html.append("</tr></thead>")
                else:
                    rows_start = 0
                
                html.append("<tbody>")
                for r in range(rows_start, len(table_rows)):
                    html.append("<tr>")
                    for cell in table_rows[r]:
                        html.append(f"<td>{parse_inline_markdown(cell.strip())}</td>")
                    html.append("</tr>")
                html.append("</tbody></table>")
                parsed_blocks.append("\n".join(html))
            in_table = False
            table_rows = []

    def flush_quote():
        nonlocal in_quote, quote_lines
        if in_quote:
            content = " ".join(quote_lines).strip()
            # Check callout type
            callout_class = "callout-note"
            callout_title = "Note"
            
            if content.upper().startswith("**NOTE:**"):
                content = content[len("**NOTE:**"):].strip()
            elif content.upper().startswith("**WARNING:**"):
                callout_class = "callout-warning"
                callout_title = "Warning"
                content = content[len("**WARNING:**"):].strip()
            elif content.upper().startswith("**IMPORTANT:**"):
                callout_class = "callout-important"
                callout_title = "Important"
                content = content[len("**IMPORTANT:**"):].strip()
            elif content.upper().startswith("**TIP:**"):
                callout_class = "callout-tip"
                callout_title = "Tip"
                content = content[len("**TIP:**"):].strip()
            else:
                # Default headerless note
                callout_title = ""
            
            title_html = f"<strong>{callout_title}</strong>" if callout_title else ""
            parsed_blocks.append(
                f'<div class="callout {callout_class}">{title_html}<p>{parse_inline_markdown(content)}</p></div>'
            )
            in_quote = False
            quote_lines = []

    current_para = []
    
    def flush_para():
        if current_para:
            text = " ".join(current_para).strip()
            if text:
                parsed_blocks.append(f"<p>{parse_inline_markdown(text)}</p>")
            current_para.clear()

    for line in lines:
        stripped = line.strip()
        
        # 1. Handle blockquotes
        if stripped.startswith('>'):
            flush_para()
            flush_list()
            flush_table()
            in_quote = True
            quote_lines.append(stripped[1:].strip())
            continue
        elif in_quote:
            flush_quote()
            
        # 2. Handle list items
        ul_match = re.match(r'^[-*+]\s+(.*)$', stripped)
        ol_match = re.match(r'^\d+\.\s+(.*)$', stripped)
        
        if ul_match:
            flush_para()
            flush_table()
            if in_list and list_type != 'ul':
                flush_list()
            in_list = True
            list_type = 'ul'
            list_items.append(ul_match.group(1))
            continue
        elif ol_match:
            flush_para()
            flush_table()
            if in_list and list_type != 'ol':
                flush_list()
            in_list = True
            list_type = 'ol'
            list_items.append(ol_match.group(1))
            continue
        elif in_list and stripped != "":
            # If line is indented, it might be a continuation of the list item, but for simplicity, we treat empty line or other block as list end
            pass
        elif in_list and stripped == "":
            flush_list()

        # 3. Handle tables
        if stripped.startswith('|') and stripped.endswith('|'):
            flush_para()
            flush_list()
            in_table = True
            # Split cells and filter out empty ends
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            table_rows.append(cells)
            continue
        elif in_table:
            flush_table()

        # 4. Handle headers
        if stripped.startswith('#'):
            flush_para()
            flush_list()
            flush_table()
            
            h_match = re.match(r'^(#+)\s*(.*)$', stripped)
            level = len(h_match.group(1))
            header_text = h_match.group(2)
            
            # Since H1 and H2 are handled at the step level, inside steps we only care about H3, H4, H5, H6
            if level >= 3:
                parsed_blocks.append(f"<h{level}>{parse_inline_markdown(header_text)}</h{level}>")
            continue

        # 5. Empty line ends paragraphs
        if stripped == "":
            flush_para()
            continue

        # 6. Normal paragraph line
        current_para.append(stripped)

    flush_para()
    flush_list()
    flush_table()
    flush_quote()

    # Step 3: Put code blocks back
    html_content = "\n".join(parsed_blocks)
    
    for i, (lang, code) in enumerate(code_blocks):
        placeholder = f"<!--CODE_BLOCK_{i}-->"
        if lang == "mermaid":
            # Render Mermaid diagram blocks
            code_html = f'<div class="mermaid">{code}</div>'
        else:
            escaped_code = escape_html(code)
            lang_attr = f' data-lang="{lang}"' if lang else ''
            lang_class = f' class="language-{lang}"' if lang else ''
            code_html = f'<pre{lang_attr}><code{lang_class}>{escaped_code}</code></pre>'
            
        html_content = html_content.replace(placeholder, code_html)

    return html_content

def build_codelab(markdown_file_path, template_file_path, output_file_path):
    if not os.path.exists(markdown_file_path):
        print(f"Error: Markdown file {markdown_file_path} not found.")
        sys.exit(1)
        
    if not os.path.exists(template_file_path):
        print(f"Error: Template file {template_file_path} not found.")
        sys.exit(1)

    with open(markdown_file_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Split md_content into lines to extract title and steps
    lines = md_content.split('\n')
    
    title = "Codelab Tutorial"
    steps = []
    current_step_title = None
    current_step_lines = []

    # Parse title and sections
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('# '):
            title = stripped[2:].strip()
        elif stripped.startswith('## '):
            if current_step_title:
                steps.append((current_step_title, "\n".join(current_step_lines)))
                current_step_lines = []
            current_step_title = stripped[3:].strip()
        elif current_step_title is not None:
            current_step_lines.append(line)
            
    if current_step_title:
        steps.append((current_step_title, "\n".join(current_step_lines)))

    if not steps:
        print("Error: No H2 (##) steps found in the Markdown document.")
        sys.exit(1)

    # Compile steps
    step_list_html = []
    sections_html = []
    
    total_steps = len(steps)
    
    for i, (step_title, step_md) in enumerate(steps):
        step_num = i + 1
        
        # Build sidebar item
        step_list_html.append(f"""
        <li class="codelab-nav__item" data-step="{step_num}">
          <a href="#step-{step_num}">
            <span class="codelab-nav__step-num">{step_num}</span>
            <span class="codelab-nav__step-title">{escape_html(step_title)}</span>
          </a>
        </li>
        """)
        
        # Parse step markdown content
        step_body_html = parse_markdown_to_html(step_md)
        
        # Build step navigation
        prev_link = ""
        if step_num > 1:
            prev_title = steps[i - 1][0]
            prev_link = f'<a class="prev" href="#step-{step_num - 1}">{escape_html(prev_title)}</a>'
        else:
            prev_link = '<span></span>' # empty span for flex alignment
            
        next_link = ""
        if step_num < total_steps:
            next_title = steps[i + 1][0]
            next_link = f'<a class="next" href="#step-{step_num + 1}">{escape_html(next_title)}</a>'
        else:
            next_link = '<span></span>'
            
        # Build final step HTML section
        sections_html.append(f"""
      <section class="codelab-step" id="step-{step_num}">
        <div class="codelab-step__header">
          <span class="codelab-step__num">{step_num}</span>
          <h2 class="codelab-step__title">{escape_html(step_title)}</h2>
        </div>
        
        {step_body_html}
        
        <div class="codelab-step-nav">
          {prev_link}
          {next_link}
        </div>
      </section>
        """)

    # Load template
    with open(template_file_path, 'r', encoding='utf-8') as f:
        template_content = f.read()

    # Fill in template placeholders
    author = "Insurance Agent Team"
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Simple substitution
    output_html = template_content
    output_html = output_html.replace("{{TITLE}}", escape_html(title))
    output_html = output_html.replace("{{AUTHOR}}", escape_html(author))
    output_html = output_html.replace("{{DATE}}", date_str)
    output_html = output_html.replace("{{STEP_LIST}}", "\n".join(step_list_html))
    output_html = output_html.replace("{{SECTIONS}}", "\n".join(sections_html))

    # Support Mermaid if mermaid blocks exist
    if '<div class="mermaid">' in output_html:
        # Inject Mermaid.js before </body>
        mermaid_script = """
  <!-- Mermaid Support -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: { useWidth: true, htmlLabels: true }
    });
  </script>
</body>
"""
        output_html = output_html.replace("</body>", mermaid_script)

    # Ensure output directories exist
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
    
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(output_html)

    print(f"✅ Successfully generated Codelab HTML at: {output_file_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert Markdown to beautiful Google Codelab HTML")
    parser.add_argument("markdown_file", help="Path to input Markdown file")
    parser.add_argument("template_file", help="Path to template.html file")
    parser.add_argument("output_file", help="Path to output HTML file")
    
    args = parser.parse_args()
    build_codelab(args.markdown_file, args.template_file, args.output_file)
