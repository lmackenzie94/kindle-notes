const rebuildButton = document.querySelector('.rebuild');
const rebuildMessage = document.getElementById('rebuild-message');
rebuildButton.addEventListener('click', () => {
  fetch('https://api.netlify.com/build_hooks/5ea1f91fd36dc28f39bad190', {
    method: 'POST',
  })
    .then((res) => {
      console.log(res);
      console.log('REBUILDING...');
      rebuildMessage.textContent = 'Now rebuilding...';
      rebuildMessage.classList.add('success');
    })
    .catch((err) => {
      rebuildMessage.textContent = 'Build error.';
      rebuildMessage.classList.add('error');
      throw new Error(`Build error: ${err}`);
    });
});
