import { db } from "../../site/js/firebase-init.js";
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderOrders(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة الطلبات</h3>
                <div>
                    <select id="statusFilter" style="padding:0.3rem 1rem;border-radius:var(--radius);border:1px solid var(--gray-200);">
                        <option value="all">جميع الحالات</option>
                        <option value="new">جديد</option>
                        <option value="reviewing">قيد المراجعة</option>
                        <option value="contacted">تم التواصل</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">ملغي</option>
                    </select>
                </div>
            </div>
            <table><thead><tr><th>#</th><th>العميل</th><th>الخدمة</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="6">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
    document.getElementById('statusFilter')?.addEventListener('change', loadData);
}

async function loadData() {
    const filter = document.getElementById('statusFilter')?.value || 'all';
    let q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    if (filter !== 'all') q = query(collection(db, "orders"), where("status", "==", filter), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="6">لا توجد طلبات</td></tr>`; return; }
    const statusMap = {
        new: 'جديد',
        reviewing: 'قيد المراجعة',
        contacted: 'تم التواصل',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        cancelled: 'ملغي'
    };
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.userName || 'زائر'}</td>
            <td>${item.itemTitle || '-'}</td>
            <td><span class="badge-status ${item.status === 'completed' ? 'active' : 'inactive'}">${statusMap[item.status] || item.status}</span></td>
            <td>${item.createdAt?.toDate?.().toLocaleDateString('ar-SA') || '-'}</td>
            <td>
                <button class="btn btn-warning-sm" onclick="window.viewOrder('${item.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn btn-primary-sm" onclick="window.updateStatus('${item.id}')"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
    window.viewOrder = (id) => viewOrderDetails(id);
    window.updateStatus = (id) => updateStatusModal(id);
}

function viewOrderDetails(id) {
    const item = data.find(d => d.id === id);
    if (!item) return;
    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = 'تفاصيل الطلب';
    document.getElementById('modalBody').innerHTML = `
        <div style="line-height:2;">
            <p><strong>العميل:</strong> ${item.userName || 'غير معروف'}</p>
            <p><strong>البريد:</strong> ${item.userEmail || '-'}</p>
            <p><strong>الجوال:</strong> ${item.phone || '-'}</p>
            <p><strong>الخدمة:</strong> ${item.itemTitle || '-'}</p>
            <p><strong>التفاصيل:</strong> ${item.details || '-'}</p>
            <p><strong>الحالة:</strong> ${item.status}</p>
            <p><strong>التاريخ:</strong> ${item.createdAt?.toDate?.().toLocaleString('ar-SA') || '-'}</p>
        </div>
    `;
    document.getElementById('modalConfirm').style.display = 'none';
    document.getElementById('modalCancel').textContent = 'إغلاق';
    modal.classList.add('show');
    document.getElementById('modalCancel').onclick = () => modal.classList.remove('show');
}

function updateStatusModal(id) {
    const item = data.find(d => d.id === id);
    if (!item) return;
    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = 'تغيير حالة الطلب';
    document.getElementById('modalBody').innerHTML = `
        <form id="statusForm">
            <div class="form-group">
                <label>الحالة الجديدة</label>
                <select id="newStatus" style="width:100%;padding:0.7rem;border-radius:var(--radius);border:1px solid var(--gray-200);">
                    <option value="new" ${item.status === 'new' ? 'selected' : ''}>جديد</option>
                    <option value="reviewing" ${item.status === 'reviewing' ? 'selected' : ''}>قيد المراجعة</option>
                    <option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>تم التواصل</option>
                    <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>قيد التنفيذ</option>
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                    <option value="cancelled" ${item.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                </select>
            </div>
            <input type="hidden" id="orderId" value="${id}" />
        </form>
    `;
    document.getElementById('modalConfirm').style.display = 'inline-block';
    document.getElementById('modalConfirm').textContent = 'تحديث';
    document.getElementById('modalCancel').textContent = 'إلغاء';
    modal.classList.add('show');
    document.getElementById('modalConfirm').onclick = async () => {
        const newStatus = document.getElementById('newStatus').value;
        try {
            await updateDoc(doc(db, "orders", id), { status: newStatus, updatedAt: new Date() });
            showToast('تم تحديث الحالة', 'success');
            modal.classList.remove('show');
            loadData();
        } catch (e) { showToast(e.message, 'error'); }
    };
}
