'use client';

import { useEffect } from 'react';

/**
 * TooltipObserver
 *
 * Elimina el tooltip nativo del browser (atributo `title`) reemplazándolo por
 * `data-tooltip`. Esto permite que el sistema CSS de tooltips en globals.css
 * muestre el tooltip arriba del elemento sin que aparezca el tooltip nativo
 * del OS encima.
 *
 * Usa MutationObserver para capturar también los elementos que se añaden
 * dinámicamente (React renders, modals, etc.).
 */
function processNode(node: Element) {
  // Solo elementos que tienen title y no son el <html> ni <head>
  if (node.hasAttribute('title') && node.tagName !== 'HTML' && node.tagName !== 'HEAD') {
    const value = node.getAttribute('title') || '';
    if (value.trim() !== '') {
      node.setAttribute('data-tooltip', value);
      node.removeAttribute('title');
    }
  }
  // Procesar hijos
  node.querySelectorAll('[title]').forEach((el) => {
    const value = el.getAttribute('title') || '';
    if (value.trim() !== '') {
      el.setAttribute('data-tooltip', value);
      el.removeAttribute('title');
    }
  });
}

export default function TooltipObserver() {
  useEffect(() => {
    // Procesar DOM existente
    processNode(document.body);

    // Observar cambios futuros
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Atributo 'title' añadido a un nodo existente
        if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
          const el = mutation.target as Element;
          const value = el.getAttribute('title') || '';
          if (value.trim() !== '') {
            el.setAttribute('data-tooltip', value);
            el.removeAttribute('title');
          }
        }

        // Nodos nuevos añadidos al DOM
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              processNode(node as Element);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
