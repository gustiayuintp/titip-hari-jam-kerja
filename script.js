// GANTI TEKS DI BAWAH INI DENGAN SPREADSHEET ID ANDA
const SPREADSHEET_ID = 'ID_GOOGLE_SHEETS_ANDA';

// Konfigurasi data posko
const POSKO_LIST = [
  { sheetName: "Canggu", poskoName: "Canggu", unitPagi: ["( HK ) 282", "( HK ) 283", "( HK ) SRC 2"], unitSore: ["( JK ) 282", "( JK ) 283", "( JK ) SRC 2"], isMultiUnit: true },
  { sheetName: "Mengwi", poskoName: "Mengwi", unitPagi: ["( HK ) 281", "( HK ) SRC 1", "( HK ) SRC 3"], unitSore: ["( JK ) 281", "( JK ) SRC 1"], isMultiUnit: true },
  { sheetName: "Petang", poskoName: "Petang", unitPagi: ["( HK ) 284"], unitSore: ["( JK ) 284"], isMultiUnit: false }
];

// Set tanggal hari ini otomatis saat web dibuka
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
  let formattedDate = "";
  if (selectedDateVal) {
    const parts = selectedDateVal.split('-'); // Format YYYY-MM-DD dari HTML
    // Buat beberapa opsi variasi format tanggal untuk pencocokan yang akurat
    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // Contoh: 10/11/2026
  }

  outputDiv.innerHTML = '';

  for (const posko of POSKO_LIST) {
    await fetchPoskoData(posko, outputDiv, formattedDate);
  }
}

async function fetchPoskoData(posko, container, targetDate) {
  // Ambil data CSV dari Google Sheets
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(posko.sheetName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal mengambil data dari Google Sheets');
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length <= 1) {
      renderCard(container, posko.poskoName, `Posko ${posko.poskoName} tidak memiliki data.`);
      return;
    }

    // CARI BARIS YANG TANGGALNYA SAMA PERSIS DENGAN INPUT USER
    // Menghindari penggunaan data dari tanggal/hari lain
    let matchedRow = null;

    for (let i = 1; i < rows.length; i++) {
      const rowDate = rows[i][0] ? rows[i][0].trim() : '';
      if (isSameDate(rowDate, targetDate)) {
        matchedRow = rows[i];
        break;
      }
    }

    // JIKA TIDAK ADA DATA PADA TANGGAL TERSEBUT
    if (!matchedRow) {
      const emptyAnnouncement = `${posko.poskoName} titip shift ${targetDate}\n\n[ Tidak ada data shift untuk tanggal ini ]`;
      renderCard(container, posko.poskoName, emptyAnnouncement);
      return;
    }

    // JIKA TANGGAL DITEMUKAN, PROSES NAMA SHIFT
    const rawPagi = matchedRow[1] || '';
    const rawSiang = matchedRow[2] || '';

    const listPagi = rawPagi.split(',').map(n => n.trim()).filter(n => n !== '');
    const listSiang = rawSiang.split(',').map(n => n.trim()).filter(n => n !== '');

    let teksPagi = listPagi.length > 0 
      ? listPagi.map((nama, idx) => `- ${nama} ${posko.unitPagi[idx] || ''}`.trim()).join('\n')
      : '- (Kosong)';

    let teksSiang = listSiang.length > 0 
      ? listSiang.map((nama, idx) => `- ${nama} ${posko.unitSore[idx] || ''}`.trim()).join('\n')
      : '- (Kosong)';

    let kalimatPagi, kalimatSore;
    const poskoLower = posko.poskoName.toLowerCase();

    if (posko.isMultiUnit) {
      kalimatPagi = `Silahkan nanti di titip namanya di masing2 unit ${poskoLower} shift pagi`;
      kalimatSore = `Silahkan nanti di titip namanya di masing2 unit ${poskoLower} shift sore`;
    } else {
      kalimatPagi = `Silahkan nanti di titip namanya di unit ${poskoLower} shift pagi`;
      kalimatSore = `Silahkan nanti di titip namanya di unit ${poskoLower} shift sore`;
    }

    const fullAnnouncement = `${posko.poskoName} titip shift ${targetDate}
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

// Fungsi bantu pencocokan tanggal fleksibel (misal 10/11/2026 vs 10-11-2026)
function isSameDate(dateInSheet, targetDate) {
  if (!dateInSheet || !targetDate) return false;
  const cleanSheetDate = dateInSheet.replace(/[-.]/g, '/');
  const cleanTargetDate = targetDate.replace(/[-.]/g, '/');
  return cleanSheetDate === cleanTargetDate;
}

// Fungsi parser CSV
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
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