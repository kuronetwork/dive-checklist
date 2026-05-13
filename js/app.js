/* app.js — Main Alpine.js component for dive-checklist */

function checklistApp() {
  return {
    // --- Data (loaded async) ---
    gearData: null,
    destinationsData: null,
    loading: true,
    loadError: false,

    // --- UI State ---
    mode: 'multi_day',
    country: 'domestic',
    darkMode: false,
    hideChecked: false,
    showNoFlyModal: false,
    showResetModal: false,
    showDestinationModal: false,
    showMobileControls: false,

    // --- Checklist State ---
    checks: { multi_day: {}, same_day: {} },
    customItems: {},
    selectedDestinationId: null,
    injectedItems: {},

    // --- No-Fly State ---
    nofly: { lastDive: '', diveType: 'multi_day' },
    noflyResults: null,
    countdownText: '',

    // --- Reset confirm ---
    _countdownTimer: null,
    modeSwitchBanner: null, // recommended mode id when dest differs from current mode

    // -------------------------------------------------------
    // INIT
    // -------------------------------------------------------
    async init() {
      // Restore dark mode first to avoid flash
      const savedDark = DiveStorage.get('dive-checklist.v1.darkMode', null);
      if (savedDark !== null) {
        this.darkMode = savedDark;
      } else {
        this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      this._applyDarkMode();

      // Restore persisted state
      this.mode = DiveStorage.get('dive-checklist.v1.mode', 'multi_day');
      this.country = DiveStorage.get('dive-checklist.v1.country', 'domestic');
      this.hideChecked = DiveStorage.get('dive-checklist.v1.hideChecked', false);
      this.checks = DiveStorage.get('dive-checklist.v1.checks', { multi_day: {}, same_day: {} });
      if (!this.checks.multi_day) this.checks.multi_day = {};
      if (!this.checks.same_day) this.checks.same_day = {};
      this.nofly = DiveStorage.get('dive-checklist.v1.nofly', { lastDive: '', diveType: 'multi_day' });

      // Load JSON data
      try {
        const [gearResp, destResp] = await Promise.all([
          fetch('data/gear.json'),
          fetch('data/destinations.json'),
        ]);
        this.gearData = await gearResp.json();
        this.destinationsData = await destResp.json();
      } catch (e) {
        this.loadError = true;
        this.loading = false;
        return;
      }

      // Restore custom items
      const modes = ['multi_day', 'same_day'];
      const allCatIds = new Set();
      modes.forEach(m => {
        (this.gearData.modes[m]?.categories || []).forEach(c => allCatIds.add(c.id));
      });
      (this.gearData.international_extras?.categories || []).forEach(c => allCatIds.add(c.id));
      allCatIds.forEach(catId => {
        modes.forEach(m => {
          const key = `dive-checklist.v1.custom.${m}.${catId}`;
          const saved = DiveStorage.get(key, []);
          if (saved.length > 0) this.customItems[`${m}.${catId}`] = saved;
        });
      });

      // Restore selected destination
      const savedDest = DiveStorage.get('dive-checklist.v1.destination', null);
      if (savedDest && this.destinationsData) {
        const dest = this.destinationsData.destinations.find(d => d.id === savedDest);
        if (dest) {
          this.selectedDestinationId = savedDest;
          this._applyDestinationItems(dest);
        }
      }

      // Compute no-fly if we have a saved last dive
      if (this.nofly.lastDive) this.computeNoFly();

      // Start countdown timer
      this._countdownTimer = setInterval(() => this.updateCountdown(), 60000);

      this.loading = false;
    },

    // -------------------------------------------------------
    // DARK MODE
    // -------------------------------------------------------
    _applyDarkMode() {
      if (this.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      this._applyDarkMode();
      DiveStorage.set('dive-checklist.v1.darkMode', this.darkMode);
    },

    // -------------------------------------------------------
    // MODE & COUNTRY
    // -------------------------------------------------------
    setMode(m) {
      this.mode = m;
      DiveStorage.set('dive-checklist.v1.mode', m);
    },

    setCountry(c) {
      this.country = c;
      DiveStorage.set('dive-checklist.v1.country', c);
    },

    // -------------------------------------------------------
    // COMPUTED: CATEGORIES
    // -------------------------------------------------------
    get currentCategories() {
      if (!this.gearData) return [];
      const modeData = this.gearData.modes[this.mode];
      if (!modeData) return [];

      let cats = modeData.categories.map(cat => ({
        ...cat,
        items: [
          ...cat.items,
          ...(this.injectedItems[cat.id] || []),
          ...(this.customItems[`${this.mode}.${cat.id}`] || []).map(ci => ({
            ...ci,
            _custom: true,
          })),
        ],
      }));

      return cats;
    },

    get internationalCategories() {
      if (!this.gearData) return [];
      return (this.gearData.international_extras?.categories || []).map(cat => ({
        ...cat,
        items: [
          ...cat.items,
          ...(this.injectedItems[cat.id] || []),
          ...(this.customItems[`${this.mode}.${cat.id}`] || []).map(ci => ({
            ...ci,
            _custom: true,
          })),
        ],
      }));
    },

    // -------------------------------------------------------
    // PROGRESS
    // -------------------------------------------------------
    _allItems() {
      const cats = this.country === 'international'
        ? [...this.internationalCategories, ...this.currentCategories]
        : this.currentCategories;
      return cats.flatMap(c => c.items);
    },

    categoryChecked(catId) {
      const cat = [...this.currentCategories, ...this.internationalCategories].find(c => c.id === catId);
      if (!cat) return 0;
      return cat.items.filter(item => this.checks[this.mode]?.[item.id]).length;
    },

    categoryTotal(catId) {
      const cat = [...this.currentCategories, ...this.internationalCategories].find(c => c.id === catId);
      return cat ? cat.items.length : 0;
    },

    get totalChecked() {
      return this._allItems().filter(item => this.checks[this.mode]?.[item.id]).length;
    },

    get totalItems() {
      return this._allItems().length;
    },

    get progressPercent() {
      if (this.totalItems === 0) return 0;
      return Math.round((this.totalChecked / this.totalItems) * 100);
    },

    // -------------------------------------------------------
    // CHECK TOGGLE
    // -------------------------------------------------------
    toggleCheck(itemId) {
      if (!this.checks[this.mode]) this.checks[this.mode] = {};
      this.checks[this.mode][itemId] = !this.checks[this.mode][itemId];
      // Trigger Alpine reactivity
      this.checks = { ...this.checks };
      DiveStorage.set(`dive-checklist.v1.checks`, this.checks);
    },

    isChecked(itemId) {
      return !!(this.checks[this.mode]?.[itemId]);
    },

    isVisible(item) {
      if (!this.hideChecked) return true;
      return !this.isChecked(item.id);
    },

    toggleHideChecked() {
      this.hideChecked = !this.hideChecked;
      DiveStorage.set('dive-checklist.v1.hideChecked', this.hideChecked);
    },

    // -------------------------------------------------------
    // CUSTOM ITEMS
    // -------------------------------------------------------
    customInput: {},

    addCustomItem(catId) {
      const name = (this.customInput[catId] || '').trim();
      if (!name) return;
      const key = `${this.mode}.${catId}`;
      if (!this.customItems[key]) this.customItems[key] = [];
      const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.customItems[key].push({ id, name });
      this.customItems = { ...this.customItems };
      this.customInput[catId] = '';
      DiveStorage.set(`dive-checklist.v1.custom.${this.mode}.${catId}`, this.customItems[key]);
    },

    removeCustomItem(catId, itemId) {
      const key = `${this.mode}.${catId}`;
      if (!this.customItems[key]) return;
      this.customItems[key] = this.customItems[key].filter(i => i.id !== itemId);
      this.customItems = { ...this.customItems };
      // Also remove check state
      if (this.checks[this.mode]) {
        delete this.checks[this.mode][itemId];
        this.checks = { ...this.checks };
        DiveStorage.set('dive-checklist.v1.checks', this.checks);
      }
      DiveStorage.set(`dive-checklist.v1.custom.${this.mode}.${catId}`, this.customItems[key]);
    },

    handleCustomKeydown(event, catId) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.addCustomItem(catId);
      }
    },

    // -------------------------------------------------------
    // RESET
    // -------------------------------------------------------
    resetChecks() {
      this.checks[this.mode] = {};
      this.checks = { ...this.checks };
      DiveStorage.set('dive-checklist.v1.checks', this.checks);
      this.showResetModal = false;
    },

    // -------------------------------------------------------
    // NO-FLY CALCULATOR
    // -------------------------------------------------------
    computeNoFly() {
      if (!this.nofly.lastDive) {
        this.noflyResults = null;
        this.countdownText = '';
        return;
      }
      const lastDiveDate = new Date(this.nofly.lastDive);
      if (isNaN(lastDiveDate.getTime())) {
        this.noflyResults = null;
        return;
      }
      const times = computeNoFlyTimes(lastDiveDate);
      this.noflyResults = {
        h12: formatDateTime(times.h12),
        h18: formatDateTime(times.h18),
        h24: formatDateTime(times.h24),
        _h12: times.h12,
        _h18: times.h18,
        _h24: times.h24,
      };
      DiveStorage.set('dive-checklist.v1.nofly', this.nofly);
      this.updateCountdown();
    },

    updateCountdown() {
      if (!this.noflyResults) { this.countdownText = ''; return; }
      const now = new Date();
      const recommendedHours = getRecommendedHours(this.nofly.diveType);
      const targetKey = recommendedHours === 12 ? '_h12' : recommendedHours === 18 ? '_h18' : '_h24';
      const target = this.noflyResults[targetKey];
      this.countdownText = formatCountdown(target, now);
    },

    get recommendedHours() {
      return getRecommendedHours(this.nofly.diveType);
    },

    // -------------------------------------------------------
    // DESTINATIONS
    // -------------------------------------------------------
    get selectedDestination() {
      if (!this.destinationsData || !this.selectedDestinationId) return null;
      return this.destinationsData.destinations.find(d => d.id === this.selectedDestinationId) || null;
    },

    get domesticDestinations() {
      if (!this.destinationsData) return [];
      return this.destinationsData.destinations.filter(d => d.region === 'domestic');
    },

    get internationalDestinations() {
      if (!this.destinationsData) return [];
      return this.destinationsData.destinations.filter(d => d.region === 'international');
    },

    selectDestination(destId) {
      if (!this.destinationsData) return;
      const dest = this.destinationsData.destinations.find(d => d.id === destId);
      if (!dest) return;

      // Clear previous injected items
      this.injectedItems = {};

      // Auto-enable international if needed
      if (dest.region === 'international') {
        this.setCountry('international');
      }

      // Inject extra items
      this._applyDestinationItems(dest);

      this.selectedDestinationId = destId;
      DiveStorage.set('dive-checklist.v1.destination', destId);
      this.showDestinationModal = false;

      // Show inline banner if recommended_mode differs (no confirm() popup)
      if (dest.recommended_mode && dest.recommended_mode !== this.mode) {
        this.modeSwitchBanner = dest.recommended_mode;
      } else {
        this.modeSwitchBanner = null;
      }
    },

    _applyDestinationItems(dest) {
      if (!dest.extra_items || dest.extra_items.length === 0) return;
      dest.extra_items.forEach(ei => {
        const catId = ei.category;
        if (!this.injectedItems[catId]) this.injectedItems[catId] = [];
        this.injectedItems[catId].push({
          id: `injected_${dest.id}_${catId}_${ei.name.replace(/\s/g, '_')}`,
          name: ei.name,
          _injected: true,
          _destName: dest.name,
        });
      });
      this.injectedItems = { ...this.injectedItems };
    },

    clearDestination() {
      this.injectedItems = {};
      this.selectedDestinationId = null;
      this.modeSwitchBanner = null;
      DiveStorage.remove('dive-checklist.v1.destination');
    },

    acceptModeSwitchBanner() {
      if (this.modeSwitchBanner) this.setMode(this.modeSwitchBanner);
      this.modeSwitchBanner = null;
    },

    dismissModeSwitchBanner() {
      this.modeSwitchBanner = null;
    },

    get modeSwitchBannerLabel() {
      return this.modeSwitchBanner === 'multi_day' ? '多天住宿' : '當天來回';
    },

    get destWaterTemp() {
      const d = this.selectedDestination;
      if (!d || !d.water_temp) return null;
      if (d.water_temp.year_round) return d.water_temp.year_round;
      const parts = [];
      if (d.water_temp.summer) parts.push(`夏 ${d.water_temp.summer}`);
      if (d.water_temp.winter) parts.push(`冬 ${d.water_temp.winter}`);
      return parts.join(' / ');
    },
  };
}
