
window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('disclaimerModal');
  const open = document.getElementById('openDisclaimer');
  const close = document.getElementById('closeDisclaimer');
  if(open && modal) open.addEventListener('click', () => modal.classList.remove('hidden'));
  if(close && modal) close.addEventListener('click', () => modal.classList.add('hidden'));
  if(modal) modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && modal) modal.classList.add('hidden'); });
});
