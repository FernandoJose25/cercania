// ── Supabase config ──
const SUPABASE_URL  = 'https://xvwsxkpgvzneiaijkeek.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d3N4a3BndnpuZWlhaWprZWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODA1NzQsImV4cCI6MjA5NTE1NjU3NH0.JHENwv5_R3r286Btk27GlXYr4pUR4-XDQTNtU1v_Vx8';

async function loadReviews() {
  const grid  = document.getElementById('reviewsGrid');
  const score = document.getElementById('rsScore');
  const stars = document.getElementById('rsStars');
  const count = document.getElementById('rsCount');
  if (!grid) return;

  try {
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    // Solo reseñas con comentario para mostrar en la landing
    const { data, error } = await sb
      .from('reviews')
      .select('rating, comment, created_at')
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6);

    // Stats globales (todas las reseñas, no solo las con comentario)
    const { data: allReviews } = await sb
      .from('reviews')
      .select('rating');

    if (error) throw error;

    // Calcular promedio
    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      score.textContent = avg.toFixed(1);
      stars.textContent = renderStars(avg);
      count.textContent = `${allReviews.length} opinión${allReviews.length !== 1 ? 'es' : ''}`;
    } else {
      score.textContent = '—';
      stars.textContent = '';
      count.textContent = 'Sé el primero en opinar';
    }

    // Renderizar cards
    if (!data || data.length === 0) {
      grid.innerHTML = '<p class="review-empty">Aún no hay reseñas con comentarios. ¡Descarga la app y sé el primero!</p>';
      return;
    }

    grid.innerHTML = data.map(r => `
      <div class="review-card fade-in">
        <div class="review-header">
          <div class="review-avatar">${'★'}</div>
          <div>
            <div class="review-name">Usuario de Cercanía</div>
            <div class="review-date">${formatDate(r.created_at)}</div>
          </div>
        </div>
        <div class="review-stars">${renderStars(r.rating)}</div>
        ${r.comment ? `<p class="review-comment">"${escapeHtml(r.comment)}"</p>` : ''}
      </div>
    `).join('');

    // Re-observar los nuevos elementos para las animaciones
    grid.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  } catch {
    grid.innerHTML = '<p class="review-empty">No se pudieron cargar las reseñas en este momento.</p>';
    document.getElementById('rsCount').textContent = '';
  }
}

function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ── Mobile menu ──
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ── Scroll animations ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in, .fade-in-delay').forEach(el => observer.observe(el));

// ── Cargar reseñas ──
loadReviews();
