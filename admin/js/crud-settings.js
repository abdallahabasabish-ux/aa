import { db } from "../../site/js/firebase-init.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { showToast } from './admin-app.js';

export async function renderSettings(container) {
    container.innerHTML = `
        <div class="table-container" style="max-width:800px;margin:0 auto;">
            <h3>إعدادات الموقع</h3>
            <form id="settingsForm">
                <div class="form-row">
                    <div class="form-group"><label>اسم الموقع (عربي)</label><input type="text" id="site_name" /></div>
                    <div class="form-group"><label>اسم الموقع (إنجليزي)</label><input type="text" id="site_name_en" /></div>
                </div>
                <div class="form-group"><label>البريد الإلكتروني للتواصل</label><input type="email" id="contact_email" /></div>
                <div class="form-group"><label>رقم الجوال</label><input type="text" id="contact_phone" /></div>
                <div class="form-group"><label>واتساب</label><input type="text" id="whatsapp" /></div>
                <div class="form-group"><label>الوصف (عربي)</label><textarea id="meta_desc" rows="2"></textarea></div>
                <div class="form-group"><label>الوصف (إنجليزي)</label><textarea id="meta_desc_en" rows="2"></textarea></div>
                <div class="form-row">
                    <div class="form-group"><label>فيسبوك</label><input type="url" id="fb" /></div>
                    <div class="form-group"><label>تويتر</label><input type="url" id="tw" /></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>انستغرام</label><input type="url" id="ig" /></div>
                    <div class="form-group"><label>يوتيوب</label><input type="url" id="yt" /></div>
                </div>
                <button type="submit" class="btn btn-primary-sm">حفظ الإعدادات</button>
            </form>
            <div id="settingsResponse" style="margin-top:1rem;"></div>
        </div>
    `;
    await loadSettings();
    document.getElementById('settingsForm').onsubmit = saveSettings;
}

async function loadSettings() {
    const docRef = doc(db, "site_settings", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('site_name').value = data.siteName || '';
        document.getElementById('site_name_en').value = data.siteName_en || '';
        document.getElementById('contact_email').value = data.contactEmail || '';
        document.getElementById('contact_phone').value = data.contactPhone || '';
        document.getElementById('whatsapp').value = data.whatsapp || '';
        document.getElementById('meta_desc').value = data.metaDescription || '';
        document.getElementById('meta_desc_en').value = data.metaDescription_en || '';
        document.getElementById('fb').value = data.social?.facebook || '';
        document.getElementById('tw').value = data.social?.twitter || '';
        document.getElementById('ig').value = data.social?.instagram || '';
        document.getElementById('yt').value = data.social?.youtube || '';
    }
}

async function saveSettings(e) {
    e.preventDefault();
    const data = {
        siteName: document.getElementById('site_name').value,
        siteName_en: document.getElementById('site_name_en').value,
        contactEmail: document.getElementById('contact_email').value,
        contactPhone: document.getElementById('contact_phone').value,
        whatsapp: document.getElementById('whatsapp').value,
        metaDescription: document.getElementById('meta_desc').value,
        metaDescription_en: document.getElementById('meta_desc_en').value,
        social: {
            facebook: document.getElementById('fb').value,
            twitter: document.getElementById('tw').value,
            instagram: document.getElementById('ig').value,
            youtube: document.getElementById('yt').value
        },
        updatedAt: new Date()
    };
    try {
        await setDoc(doc(db, "site_settings", "main"), data, { merge: true });
        document.getElementById('settingsResponse').innerHTML = `<span style="color:#22C55E;">✅ تم حفظ الإعدادات بنجاح</span>`;
        showToast('تم حفظ الإعدادات', 'success');
    } catch (e) {
        document.getElementById('settingsResponse').innerHTML = `<span style="color:#EF4444;">❌ ${e.message}</span>`;
        showToast(e.message, 'error');
    }
}
