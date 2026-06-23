let state = {
  sectionOrder: [
    { "key": "about", "enabled": true, "navLabel": "" },
    { "key": "blog", "enabled": true, "navLabel": "" }
  ]
};

// User clicks Pen on about
let item1 = state.sectionOrder.find(o => (o.key || o) === 'about');
item1.navLabel = "Về dịch vụ a";

// User clicks Pen on blog
let item2 = state.sectionOrder.find(o => (o.key || o) === 'blog');
item2.navLabel = "Giải mã clow";

// saveSectionOrder
const list = [ {dataset:{key:'about'}}, {dataset:{key:'blog'}} ];
const items = list.map(el => {
  const key = el.dataset.key;
  let navLabel = '';
  const oldItem = state.sectionOrder.find(o => (o.key || o) === key);
  if (oldItem && oldItem.navLabel) navLabel = oldItem.navLabel;
  return { key, navLabel };
});

console.log(items);
