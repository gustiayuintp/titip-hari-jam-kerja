// GANTI TEKS DI BAWAH INI DENGAN SPREADSHEET ID ANDA
const SPREADSHEET_ID = '1Q9yZV5Rs89aCF93kEVJBPSawo4fxTJ8uj_B53qj2td0';

// Konfigurasi data posko
const POSKO_LIST = [
  { sheetName: "Canggu", poskoName: "Canggu", unitPagi: ["( HK ) 282", "( HK ) 283", "( HK ) SRC 2"], unitSore: ["( JK ) 282", "( JK ) 283", "( JK ) SRC 2"], isMultiUnit: true },
  { sheetName: "Mengwi", poskoName: "Mengwi", unitPagi: ["( HK ) 281", "( HK ) SRC 1", "( HK ) SRC 3"], unitSore: ["( JK ) 281", "( JK ) SRC 1"], isMultiUnit: true },
  { sheetName: "Petang", poskoName: "Petang", unitPagi: ["( HK ) 284"], unitSore: ["( JK ) 284"], isMultiUnit: false }
];

// Set tanggal hari ini otomatis di input saat web dibuka
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inputTanggal').value = today;
  loadAllPoskoData();
});

document.getElementById('btnRefresh').addEventListener('click', loadAllPoskoData);

async function loadAllPoskoData() {
  const outputDiv = document.getElementById('output');
  outputDiv.innerHTML = '<p class="status">Mengambil data posko...</p>';

  const selectedDateVal = document.getElementById('inputTanggal').value;
  let formattedDate = "-";
  if (selectedDateVal) {
    const parts = selectedDateVal.split('-');
    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  outputDiv.innerHTML = '';

  for (const posko of POSKO_LIST) {
    await fetchPoskoData(posko, outputDiv, formattedDate);
  }
}

async function fetchPoskoData(posko, container, tanggalManual) {
  // Menggunakan endpoint CSV publik yang lebih stabil
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(posko.sheetName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Ambil data baris ke-2 (index 1), jika tidak ada ambil baris pertama
    const row = rows.length > 1 ? rows[1] : (rows[0] || []);

    const tanggal = (tanggalManual && tanggalManual !== "--/") ? tanggalManual : (row[0] || '-');
    const rawPagi = row[1] || '';
    const rawSiang = row[2] || '';

    const listPagi = rawPagi.split(',').map(n => n.trim()).filter(n => n !== '');
    const listSiang = rawSiang.split(',').map(n => n.trim()).filter(n => n !== '');

    let teksPagi = listPagi.map((nama, idx) => {
      const unit = posko.unitPagi[idx] || '';
      return `- ${nama} ${unit}`.trim();
    }).join('\n');

    let teksSiang = listSiang.map((nama, idx) => {
      const unit = posko.unitSore[idx] || '';
      return `- ${nama} ${unit}`.trim();
    }).join('\n');

    let kalimatPagi, kalimatSore;
    const poskoLower = posko.poskoName.toLowerCase();

    if (posko.isMultiUnit) {
      kalimatPagi = `Silahkan nanti di titip namanya di masing2 unit ${poskoLower} shift pagi`;
      kalimatSore = `Silahkan nanti di titip namanya di masing2 unit ${poskoLower} shift sore`;
    } else {
      kalimatPagi = `Silahkan nanti di titip namanya di unit ${poskoLower} shift pagi`;
      kalimatSore = `Silahkan nanti di titip namanya di unit ${poskoLower} shift sore`;
    }

    const fullAnnouncement = `${posko.poskoName} titip shift ${tanggal}
Shift pagi
${teksPagi}
${kalimatPagi}

Shift sore
${teksSiang}
${kalimatSore}`;

    renderCard(container, posko.poskoName, fullAnnouncement);

  } catch (error) {
    console.error(error);
    renderCard(container, posko.poskoName, `Gagal memuat data posko ${posko.poskoName}. Pastikan opsi "Publish to web" di Google Sheets sudah aktif.`);
  }
}

// Fungsi sederhana pemisah CSV
function parseCSV(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    // Memisah berdasarkan koma yang tidak ada di dalam tanda kutip
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*)/g;
    const row = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] ? match[1].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
      row.push(val);
    }
    return row;
  });
}

function renderCard(container, poskoName, text) {
  const card = document.createElement('div');
  card.className = 'card';

  const title = document.createElement('h3');
  title.textContent = `Posko ${poskoName}`;

  const pre = document.createElement('pre');
  pre.textContent = text;

  const btn = document.createElement('button');
  btn.className = 'btn-copy';
  btn.textContent = `📋 Salin ${poskoName}`;
  btn.onclick = () => copyToClipboard(text, btn);

  card.appendChild(title);
  card.appendChild(pre);
  card.appendChild(btn);
  container.appendChild(card);
}

function copyToClipboard(text, buttonElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = '✅ Disalin!';
    buttonElement.style.backgroundColor = '#16a085';
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.style.backgroundColor = '#2ecc71';
    }, 2000);
  });
}