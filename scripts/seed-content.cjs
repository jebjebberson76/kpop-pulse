const fs = require('fs');
const path = require('path');
const companies = [
  { name: 'HYBE', count: 12 },
  { name: 'JYP', count: 10 },
  { name: 'SM', count: 5 },
  { name: 'YG', count: 5 },
  { name: 'CUBE', count: 5 },
  { name: 'STARSHIP', count: 5 },
  { name: 'KQ Entertainment', count: 5 },
  { name: 'P Nation', count: 5 },
  { name: 'Kakao Entertainment', count: 5 },
  { name: 'Jellyfish Entertainment', count: 5 },
];

const comebacks = [];
const tours = [];

for (const company of companies) {
  for (let i = 1; i <= company.count; i += 1) {
    comebacks.push({
      active: false,
      title: `${company.name} Comeback ${i}`,
      date: 'TBA',
      summary: 'Placeholder entry. Update with official details.',
      company: company.name,
      companyLabel: company.name,
    });

    const status = i % 2 === 0 ? 'Confirmed' : 'Announced';
    tours.push({
      active: false,
      title: `${company.name} World Tour ${i}`,
      status,
      summary: 'Placeholder entry. Update with official details.',
      company: company.name,
      companyLabel: company.name,
      metaSuffix: status === 'Confirmed' ? 'Tickets on sale TBA' : 'Details soon',
      highlight: i === 1,
      dates: [],
    });
  }
}

const outDir = path.join(process.cwd(), 'content');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'comebacks.json'), JSON.stringify({ items: comebacks }, null, 2));
fs.writeFileSync(path.join(outDir, 'tours.json'), JSON.stringify({ items: tours }, null, 2));
