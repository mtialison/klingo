/* Perfil em tela inteira, sem a compensação lateral de scrollbar do Bootstrap. */
(function () {
  'use strict';
  const STYLE_ID = 'tm-profile-fullscreen-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* O perfil já possui rolagem interna; a página ao fundo não precisa de outra. */
      html:has(#perfilPacienteModal.show) { overflow: hidden !important; }
      #perfilPacienteModal { padding: 0 !important; }
    `;
    document.head.appendChild(style);
  }
  tmRuntime.register('perfil em tela inteira', injectStyle);
})();
