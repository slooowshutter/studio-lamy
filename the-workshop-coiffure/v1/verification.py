"""Exporte le HTML réel pour le test : python3 verification.py | node verification.cjs."""
import json
from pathlib import Path
from bs4 import BeautifulSoup, Tag


def node(tag):
    return {
        "tag": tag.name,
        "attrs": {k: " ".join(v) if isinstance(v, list) else v for k, v in tag.attrs.items()},
        "text": "".join(str(x) for x in tag.children if not isinstance(x, Tag)),
        "children": [node(x) for x in tag.children if isinstance(x, Tag)],
    }


page = BeautifulSoup(Path(__file__).with_name("index.html").read_text(), "html.parser")
print(json.dumps(node(page.html)))
