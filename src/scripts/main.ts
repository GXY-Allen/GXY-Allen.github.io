import { initUI } from './ui';
import { initEffects } from './effects';
import { initSidebar } from './sidebar';
import { initResponsive } from './responsive';
import { initPost } from './post';
import { initSettings } from './settings';
import { initSearch } from './search';
import { initExtras } from './extras';

document.documentElement.classList.add('js');

function safe(fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('astro:page-load', () => {
  document.documentElement.classList.add('js');
  safe(initUI);
  safe(initResponsive);
  safe(initSidebar);
  safe(initPost);
  safe(initEffects);
  safe(initSettings);
  safe(initSearch);
  safe(initExtras);
});
