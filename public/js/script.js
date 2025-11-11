// public/js/script.js

// --- Helper: show toast/alert ---
function showMsg(elId, type, text) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `
    <div class="alert alert-${type}" role="alert" style="margin-top:10px;">
      ${text}
    </div>
  `;
}

// --- Donor Registration ---
async function submitDonorForm(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const blood_group = document.getElementById('blood_group').value;
  const phone = document.getElementById('phone').value.trim();
  const city = document.getElementById('city').value.trim();
  const availability = document.getElementById('availability').value;

  const res = await fetch('/api/donors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, blood_group, phone, city, availability })
  });

  const data = await res.json();
  if (data.ok) {
    showMsg('donorMsg', 'success', 'Donor registered successfully!');
    e.target.reset();
  } else {
    showMsg('donorMsg', 'danger', data.error || 'Failed to register donor.');
  }
}

// --- Donor Search ---
async function searchDonors(e) {
  e.preventDefault();
  const blood_group = document.getElementById('s_blood_group').value;
  const city = document.getElementById('s_city').value.trim();

  const params = new URLSearchParams();
  if (blood_group) params.append('blood_group', blood_group);
  if (city) params.append('city', city);

  const res = await fetch('/api/donors?' + params.toString());
  const data = await res.json();

  const listEl = document.getElementById('donorList');
  listEl.innerHTML = '';

  if (data.ok && data.donors.length) {
    data.donors.forEach(d => {
      const li = document.createElement('div');
      li.className = 'col-md-6';
      li.innerHTML = `
        <div class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">${d.name} <span class="badge bg-danger">${d.blood_group}</span></h5>
            <p class="card-text mb-1"><strong>City:</strong> ${d.city}</p>
            <p class="card-text mb-1"><strong>Phone:</strong> <a href="tel:${d.phone}">${d.phone}</a></p>
            <span class="badge ${d.availability === 'Available' ? 'bg-success' : 'bg-secondary'}">
              ${d.availability}
            </span>
          </div>
        </div>
      `;
      listEl.appendChild(li);
    });
  } else {
    listEl.innerHTML = `<div class="alert alert-warning">No donors found for your search.</div>`;
  }
}

// --- Create Emergency Request ---
async function submitRequestForm(e) {
  e.preventDefault();
  const patient_name = document.getElementById('patient_name').value.trim();
  const blood_group = document.getElementById('r_blood_group').value;
  const hospital = document.getElementById('hospital').value.trim();
  const city = document.getElementById('r_city').value.trim();
  const contact_phone = document.getElementById('contact_phone').value.trim();

  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_name, blood_group, hospital, city, contact_phone })
  });

  const data = await res.json();
  if (data.ok) {
    showMsg('reqMsg', 'success', 'Emergency request posted!');
    e.target.reset();
  } else {
    showMsg('reqMsg', 'danger', data.error || 'Failed to post request.');
  }
}
