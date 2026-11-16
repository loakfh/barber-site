// Конфиг сайта. FIXTURE=1 подмешивает тестовые локации из tests/fixture.json —
// только для проверки панели записи, в боевую сборку они не попадают.
import base from '../../content/site.config.json';
import mediaJson from '../../content/media.json';
import fixtureJson from '../../tests/fixture.json';

const fixture = process.env.FIXTURE ? fixtureJson : {};
export const cfg = { ...base, ...fixture, contacts: { ...base.contacts, ...(fixture.contacts || {}) } };
export const media = mediaJson;
export const isPreview = Boolean(process.env.SITE_BASE);
