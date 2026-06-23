const state = { sectionOrder: [] };
let order = ['about', 'blog'];
order = order.map(o => typeof o === 'string' ? {key: o, enabled: true} : o);

// simulate prompt
let key = 'blog';
let newLabel = 'Giai Ma Clowcat';
let item = state.sectionOrder.find(o => (o.key || o) === key);
if (!item) {
  item = { key: key, enabled: true };
  state.sectionOrder.push(item);
}
item.navLabel = newLabel.trim();

// simulate saveSectionOrder
const items = [{key: 'about'}, {key: 'blog'}].map(el => {
  const k = el.key;
  let navLabel = '';
  const oldItem = state.sectionOrder.find(o => (o.key || o) === k);
  if (oldItem && oldItem.navLabel) navLabel = oldItem.navLabel;
  return { key: k, enabled: true, navLabel };
});
console.log(items);
