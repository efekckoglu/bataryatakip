/* ==========================================================================
   İnciroğlu BMW | Akü Takip Sistemi - JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Varsayılan Örnek Araçlar
const defaultVehicles = [
    {
        id: '1',
        chassis: 'WBA11AB000XXXX123',
        model: 'BMW i4 M50',
        needsCharge: 'no',
        soc: 100,
        smallBattery: 'connected',
        createdAt: '28.07.2026 10:15',
        note: 'Showroom alanında sergileniyor.'
    },
    {
        id: '2',
        chassis: 'WMW22CD000XXXX456',
        model: 'MINI Countryman SE',
        needsCharge: 'yes',
        soc: 15, // %20 altı kritik
        smallBattery: 'disconnected',
        createdAt: '28.07.2026 11:30',
        note: 'Akü takviyesi gerekiyor.'
    }
];

let vehicles = [];
let auditLogs = []; // Excel'e yazılacak işlem günlüğü
let editingVehicleId = null;

function initApp() {
    loadData();
    updateTodayDate();
    setupEventListeners();
    render();
}

function updateTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formatted = `${day}.${month}.${year}`;
    
    const el = document.getElementById('todayDate');
    if (el) el.innerText = formatted;
}

function getCurrentDateTimeFormatted() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// LocalStorage Yükleme
function loadData() {
    const savedVehicles = localStorage.getItem('inciroglu_bmw_vehicles');
    if (savedVehicles) {
        try { vehicles = JSON.parse(savedVehicles); } catch (e) { vehicles = defaultVehicles; }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }

    const savedLogs = localStorage.getItem('inciroglu_bmw_audit_logs');
    if (savedLogs) {
        try { auditLogs = JSON.parse(savedLogs); } catch (e) { auditLogs = []; }
    }
}

function saveVehicles() {
    localStorage.setItem('inciroglu_bmw_vehicles', JSON.stringify(vehicles));
}

function saveAuditLogs() {
    localStorage.setItem('inciroglu_bmw_audit_logs', JSON.stringify(auditLogs));
}

// İşlem Günlüğüne Kayıt Ekleme
function logAction(chassis, model, actionDetails) {
    const logEntry = {
        Tarih_Saat: getCurrentDateTimeFormatted(),
        Sase_No: chassis,
        Model: model,
        Yapilan_Islem: actionDetails
    };
    auditLogs.unshift(logEntry); // En son işlemi başa ekle
    saveAuditLogs();
}

// Event Listeners
function setupEventListeners() {
    const openBtn1 = document.getElementById('newVehicleButton');
    const openBtn2 = document.getElementById('openVehicleModalHeader');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelVehicle');
    const saveBtn = document.getElementById('saveVehicle');

    if (openBtn1) openBtn1.addEventListener('click', openVehicleModal);
    if (openBtn2) openBtn2.addEventListener('click', openVehicleModal);
    if (closeBtn) closeBtn.addEventListener('click', closeVehicleModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeVehicleModal);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveVehicle);

    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetail');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);
}

// Form İçinde Şarj İhtiyacı Var Mı Sorusu
window.toggleChargeInputs = function() {
    const select = document.getElementById('needsChargeSelect');
    const container = document.getElementById('chargeInputsContainer');
    if (select && container) {
        if (select.value === 'yes') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
};

function render() {
    renderTable();
    renderCards();
    renderNotifications();
}

function renderTable() {
    const tableBody = document.getElementById('vehicleTable');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (vehicles.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 24px;">Sistemde kayıtlı araç bulunmuyor.</td></tr>`;
        return;
    }

    vehicles.forEach(vehicle => {
        const isNeed = vehicle.needsCharge === 'yes';
        const isSocLow = isNeed && (vehicle.soc !== undefined && vehicle.soc !== '' && Number(vehicle.soc) <= 20);
        const isCritical = isNeed || isSocLow;

        const tr = document.createElement('tr');
        if (isCritical) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${vehicle.model}</td>
            <td>
                ${isCritical ? `
                    <span class="statusBadge needCharge">
                        <i class="fa-solid fa-triangle-exclamation"></i> Şarj Gerekli
                    </span>
                ` : `
                    <span class="statusBadge healthy">
                        <i class="fa-solid fa-check"></i> Sağlıklı
                    </span>
                `}
            </td>
            <td>
                ${isNeed ? `<strong>%${vehicle.soc ?? 0}</strong>` : `<span style="color:var(--text-muted);">-</span>`}
            </td>
            <td>
                ${vehicle.smallBattery === 'connected' ? `
                    <span class="smallBatteryBadge connected"><i class="fa-solid fa-link"></i> Bağlı</span>
                ` : `
                    <span class="smallBatteryBadge disconnected"><i class="fa-solid fa-unlink"></i> Bağlı Değil</span>
                `}
            </td>
            <td style="color: var(--text-secondary); font-size: 12px;">${vehicle.createdAt}</td>
            <td>
                <div class="tableButtons">
                    <button onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="editVehicle('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash" style="color: #ef4444;"></i></button>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function renderCards() {
    const total = vehicles.length;
    let healthy = 0;
    let danger = 0;

    vehicles.forEach(v => {
        if (v.needsCharge === 'yes' || (v.soc !== undefined && Number(v.soc) <= 20)) {
            danger++;
        } else {
            healthy++;
        }
    });

    if (document.getElementById('totalVehicle')) document.getElementById('totalVehicle').innerText = total;
    if (document.getElementById('normalVehicle')) document.getElementById('normalVehicle').innerText = healthy;
    if (document.getElementById('dangerVehicle')) document.getElementById('dangerVehicle').innerText = danger;
}

function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;

    area.innerHTML = '';

    const criticalVehicles = vehicles.filter(v => v.needsCharge === 'yes' || (v.soc !== undefined && Number(v.soc) <= 20));

    if (criticalVehicles.length === 0) {
        area.innerHTML = `
            <div style="background: #dcfce7; color: #15803d; padding: 12px 16px; border-radius: 10px; font-size: 13px;">
                <i class="fa-solid fa-circle-check"></i> Tüm araçlar sağlıklı. Şarj ihtiyacı olan araç bulunmuyor.
            </div>
        `;
        return;
    }

    criticalVehicles.forEach(v => {
        const card = document.createElement('div');
        card.className = 'notificationCard';
        card.innerHTML = `
            <strong>${v.model} (${v.chassis})</strong> - Şarj İhtiyacı Var! ${v.soc !== undefined ? `HV Batarya: %${v.soc}` : ''} | Küçük Akü: ${v.smallBattery === 'connected' ? 'Bağlı' : 'Bağlı Değil'}
        `;
        area.appendChild(card);
    });
}

// Modal Aç / Kapat
function openVehicleModal() {
    editingVehicleId = null;
    document.getElementById('modalTitle').innerText = 'Yeni Araç Ekle';
    document.getElementById('vehicleChassis').value = '';
    document.getElementById('vehicleModel').value = '';
    document.getElementById('needsChargeSelect').value = 'no';
    document.getElementById('batterySoc').value = '100';
    document.getElementById('smallBatteryStatus').value = 'connected';
    document.getElementById('vehicleNote').value = '';
    
    document.getElementById('createdAtGroup').classList.add('hidden');
    toggleChargeInputs();

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.remove('active');
}

function handleSaveVehicle() {
    const chassis = document.getElementById('vehicleChassis').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const needsCharge = document.getElementById('needsChargeSelect').value;
    const soc = document.getElementById('batterySoc').value;
    const smallBattery = document.getElementById('smallBatteryStatus').value;
    const note = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Araç Modelini doldurun.');
        return;
    }

    if (editingVehicleId) {
        // Düzenleme
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                needsCharge,
                soc: needsCharge === 'yes' ? soc : 100,
                smallBattery,
                note
            };
            logAction(chassis, model, `Araç Bilgileri Güncellendi (Şarj İhtiyacı: ${needsCharge === 'yes' ? 'Var' : 'Yok'}, HV SOC: %${soc}, Küçük Akü: ${smallBattery})`);
        }
    } else {
        // Yeni Araç Kaydı
        const newCreatedAt = getCurrentDateTimeFormatted();
        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            needsCharge,
            soc: needsCharge === 'yes' ? soc : 100,
            smallBattery,
            createdAt: newCreatedAt,
            note
        };
        vehicles.push(newVehicle);
        logAction(chassis, model, `Sisteme Yeni Araç Eklendi (Kayıt Tarihi: ${newCreatedAt})`);
    }

    saveVehicles();
    render();
    closeVehicleModal();
}

window.editVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    document.getElementById('modalTitle').innerText = 'Aracı Düzenle';
    document.getElementById('vehicleChassis').value = vehicle.chassis;
    document.getElementById('vehicleModel').value = vehicle.model;
    document.getElementById('needsChargeSelect').value = vehicle.needsCharge || 'no';
    document.getElementById('batterySoc').value = vehicle.soc ?? 100;
    document.getElementById('smallBatteryStatus').value = vehicle.smallBattery || 'connected';
    document.getElementById('vehicleNote').value = vehicle.note || '';

    // Oluşturulma Tarihini Göster
    const createdAtField = document.getElementById('vehicleCreatedAtDisplay');
    const createdAtGroup = document.getElementById('createdAtGroup');
    if (createdAtField && createdAtGroup) {
        createdAtField.value = vehicle.createdAt || '-';
        createdAtGroup.classList.remove('hidden');
    }

    toggleChargeInputs();

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
};

window.deleteVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    if (confirm(`${vehicle.model} (${vehicle.chassis}) aracını silmek istediğinize emin misiniz?`)) {
        logAction(vehicle.chassis, vehicle.model, 'Araç Sistemden Silindi');
        vehicles = vehicles.filter(v => v.id !== id);
        saveVehicles();
        render();
    }
};

window.openDetailModal = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    document.getElementById('detailChassis').innerText = vehicle.chassis;
    document.getElementById('detailModel').innerText = vehicle.model;
    document.getElementById('detailNeed').innerText = vehicle.needsCharge === 'yes' ? 'Şarj İhtiyacı Var' : 'Sağlıklı';
    document.getElementById('detailCreated').innerText = vehicle.createdAt || '-';
    document.getElementById('detailNoteText').innerText = vehicle.note || 'Not bulunmuyor.';

    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('active');
};

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}

// EXCEL (XLSX) DIŞA AKTARMA FONKSİYONU
window.exportAuditLogToExcel = function() {
    if (auditLogs.length === 0) {
        alert('Henüz kaydedilmiş bir işlem geçmişi/log bulunmuyor.');
        return;
    }

    // SheetJS ile Workbook Oluşturma
    const worksheet = XLSX.utils.json_to_sheet(auditLogs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "İşlem Logları");

    // Excel Dosyasını İndirme
    const fileName = `Inciroglu_BMW_Aku_Islem_Gecmisi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
