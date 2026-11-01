from html.parser import HTMLParser
import json,sys
class Parser(HTMLParser):
 def __init__(self):
  super().__init__(); self.root={'tag':'document','attrs':{},'children':[]}; self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  node={'tag':tag,'attrs':dict(attrs),'children':[]}; self.stack[-1]['children'].append(node)
  if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']: self.stack.append(node)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==tag: self.stack=self.stack[:i]; break
 def handle_data(self,data):
  self.stack[-1]['children'].append(data)
p=Parser();p.feed(open(__file__.replace('verify-dom.py', 'index.html')).read());print(json.dumps(p.root))
