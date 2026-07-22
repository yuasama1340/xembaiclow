const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./app.js'), 'utf8');
const match = source.match(/function createNativeEditor[\s\S]*?(?=\nfunction setQuillHtml)/);
assert.ok(match, 'Không tìm thấy createNativeEditor trong app.js');

function makeNode(tagName = 'div') {
  return {
    tagName,
    children: [],
    textContent: '',
    innerHTML: '',
    dataset: {},
    classList: { add() {} },
    setAttribute() {},
    appendChild(child) { this.children.push(child); this.lastChild = child; return child; }
  };
}

const context = {
  document: {
    createElement: makeNode,
    createTextNode(text) { return { textContent: text }; }
  }
};
vm.createContext(context);
vm.runInContext(`${match[0]}; this.createNativeEditor = createNativeEditor;`, context);

const container = makeNode();
const editor = context.createNativeEditor(container, 'Nhập nội dung');
assert.equal(container.contentEditable, 'true');
assert.equal(container.dataset.placeholder, 'Nhập nội dung');

editor.clipboard.dangerouslyPasteHTML(0, '<p>Nội dung</p>');
assert.equal(container.innerHTML, '<p>Nội dung</p>');

editor.insertEmbed(0, 'image', 'https://example.test/image.webp');
assert.equal(container.children[0].children[0].src, 'https://example.test/image.webp');
console.log('Native editor fallback test passed');
