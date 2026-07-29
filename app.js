/* ==========================================================================
   İnciroğlu BMW | Akü Takip CSS Framework (Dark & Light Entegreli)
   ========================================================================== */

/* AYDINLIK TEMA DEĞİŞKENLERİ */
body.light-theme {
    --bg-main: #f8fafc;
    --card-bg: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border-color: #e2e8f0;
    
    --bmw-blue: #0066b1;
    --status-green: #10b981;
    --status-red: #ef4444;
    --status-yellow: #f59e0b;
}

/* KARANLIK TEMA DEĞİŞKENLERİ */
body.dark-theme {
    --bg-main: #0f172a;
    --card-bg: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
    --border-color: #334155;
    
    --bmw-blue: #38bdf8;
    --status-green: #34d399;
    --status-red: #f87171;
    --status-yellow: #fbbf24;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Outfit', sans-serif;
}

body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    min-height: 100vh;
    transition: background-color 0.3s, color 0.3s;
}

/* BMW //M Renkli Üst Accent Çizgisi */
.bmw-m-stripe {
    height: 5px;
    width: 100%;
    background: linear-gradient(90deg, #00a0e3 0%, #002663 50%, #e2001a 100%);
}

.mainContent {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
}

/* Header */
.bmw-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--card-bg);
    padding: 20px 28px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    margin-bottom: 24px;
}

.brandBadge {
    display: flex;
    align-items: center;
    gap: 16px;
}

.bmwLogoIcon {
    width: 48px;
    height: 48px;
    background: rgba(0, 102, 177, 0.1);
    color: var(--bmw-blue);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
}

.bmwSeriesTitle {
    font-size: 11px;
    font-weight: 700;
    color: var(--bmw-blue);
    letter-spacing: 1.5px;
}

.mTextColorful { font-weight: 900; letter-spacing: -1px; }
.mTextColorful .c1 { color: #00a0e3; }
.mTextColorful .c2 { color: #002663; }
.mTextColorful .c3 { color: #e2001a; }

.headerSubtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
}

.headerRight {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* Tema Değiştirme Butonu */
.themeToggleBtn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s;
}
.themeToggleBtn:hover { background: var(--border-color); }

.todayDate {
    background: var(--bg-main);
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border-color);
}

/* Butonlar */
.bmwBtnPrimary {
    background: var(--bmw-blue);
    color: #fff;
    border: none;
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.bmwBtnSecondary {
    background: #10b981;
    color: #fff;
    border: none;
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.bmwBtnAdmin {
    background: #8b5cf6;
    color: #fff;
    border: none;
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Dashboard Kartları */
.dashboardCards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
    margin-bottom: 24px;
}

.card {
    background: var(--card-bg);
    border-radius: 14px;
    padding: 20px;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 16px;
}

.cardIcon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}
.cardIcon.blue { background: rgba(2, 132, 199, 0.15); color: #38bdf8; }
.cardIcon.green { background: rgba(22, 163, 74, 0.15); color: #4ade80; }
.cardIcon.yellow { background: rgba(217, 119, 6, 0.15); color: #fbbf24; }
.cardIcon.red { background: rgba(225, 29, 72, 0.15); color: #f87171; }

.cardContent h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.cardContent span { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.cardContent small { font-size: 11px; color: var(--text-muted); }

/* Tablolar */
.vehicleSection {
    background: var(--card-bg);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    padding: 24px;
    margin-bottom: 24px;
}

.sectionHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.sectionHeader h2 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.sectionHeader p { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.tableArea { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }

th {
    padding: 12px 16px;
    background: var(--bg-main);
    color: var(--text-secondary);
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
}

td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
}

tr.rowDanger { background: rgba(225, 29, 72, 0.1); }

/* Durum Rozetleri */
.statusBadge {
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.statusBadge.healthy { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.statusBadge.needCharge { background: rgba(225, 29, 72, 0.15); color: #f87171; }

.smallBatteryBadge {
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}
.smallBatteryBadge.connected { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.smallBatteryBadge.disconnected { background: rgba(225, 29, 72, 0.15); color: #f87171; }

/* Tablo Butonları */
.tableButtons { display: flex; gap: 6px; }
.tableButtons button {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
}
.tableButtons button:hover { background: var(--border-color); }

/* Bildirim Paneli */
.notificationSection {
    background: var(--card-bg);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    padding: 20px;
    margin-bottom: 24px;
}

.notificationCard {
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(225, 29, 72, 0.1);
    color: #f87171;
    border: 1px solid rgba(225, 29, 72, 0.2);
    font-size: 13px;
    margin-top: 10px;
}

/* Kaydırılabilir Modallar */
.modal {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
}

.modal.active { display: flex; }

.modalContent {
    background: var(--card-bg);
    color: var(--text-primary);
    border-radius: 16px;
    width: 100%;
    max-width: 550px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
}

.modalHeader {
    padding: 20px 24px 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}
.modalHeader button { border: none; background: transparent; font-size: 18px; cursor: pointer; color: var(--text-muted); }

.modalBody {
    padding: 20px 24px;
    overflow-y: auto;
}

.inputGroup {
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.inputGroup.full { width: 100%; }
.inputGroup label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.inputGroup input, .inputGroup select, .inputGroup textarea {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-main);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
}

.chargeInputsGroup {
    background: var(--bg-main);
    padding: 14px;
    border-radius: 10px;
    border: 1px dashed var(--border-color);
    margin-bottom: 14px;
}

.hidden { display: none !important; }

.modalFooter {
    padding: 14px 24px 20px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--border-color);
}

.cancelButton {
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-primary);
    cursor: pointer;
}
.saveButton {
    padding: 10px 18px;
    border-radius: 8px;
    border: none;
    background: var(--bmw-blue);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
}

/* Detay Grid */
.detailGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background: var(--bg-main);
    padding: 16px;
    border-radius: 10px;
}
.detailGrid div span { display: block; font-size: 11px; color: var(--text-muted); }
.detailGrid div strong { font-size: 13px; color: var(--text-primary); }

.notesHistoryContainer {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.historyNoteItem {
    background: var(--bg-main);
    border-left: 3px solid var(--bmw-blue);
    padding: 10px 12px;
    border-radius: 6px;
}

.historyNoteItem .noteDate { font-size: 11px; font-weight: 700; color: var(--bmw-blue); }
.historyNoteItem .noteText { font-size: 13px; color: var(--text-primary); }

/* Özet Rapor */
.summaryReportArea { font-size: 13px; line-height: 1.6; }
.summaryReportCard {
    background: var(--bg-main);
    padding: 14px;
    border-radius: 10px;
    margin-bottom: 10px;
    border: 1px solid var(--border-color);
}

/* Admin Özel Stilleri */
.adminTabHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(139, 92, 246, 0.1);
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 14px;
    font-size: 12px;
}

.adminCard {
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    padding: 14px;
    border-radius: 10px;
}
.adminCard h3 { font-size: 14px; margin-bottom: 6px; }

.adminLogList {
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.adminLogItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

/* Footer */
.footer {
    display: flex;
    justify-content: space-between;
    padding: 16px 0;
    color: var(--text-muted);
    font-size: 12px;
    border-top: 1px solid var(--border-color);
    margin-top: 20px;
}
.mColorBadge { font-weight: 700; color: var(--bmw-blue); }
