// ==UserScript==
// @name         Effinity - Ajustes Modal (v2.8)
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Ajustes visuais e layout do modal + cores do header
// @match        https://pulse.sono.effinity.com.br/*
// @updateURL    https://github.com/mtialison/effinity/raw/main/effinity.user.js
// @downloadURL  https://github.com/mtialison/effinity/raw/main/effinity.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function aplicarEstilos() {
        const styleId = 'tm-custom-style-v28';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `

        /* HEADER - COR PERSONALIZADA */
        .list-group-item.list-group-item-success {
            background-color: #d5edff !important;
            color: #003358 !important;
            border-color: #bcdff5 !important;
        }

        .list-group-item.list-group-item-success * {
            color: #003358 !important;
        }

        /* INPUTS - AJUSTE GERAL */
        .modal .form-control {
            height: 32px !important;
            font-size: 13px !important;
        }

        /* TEXTAREA OBSERVAÇÃO */
        textarea {
            white-space: normal !important;
            word-break: break-word !important;
            align-items: flex-start !important;
        }

        `;
        document.head.appendChild(style);
    }

    function init() {
        setTimeout(() => {
            aplicarEstilos();
        }, 500);
    }

    init();
})();
