const { Notice, setIcon } = require("obsidian");
const { execFileSync, execSync, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const NOVELER_VIEW_TYPE = "noveler-manuscript-writer";
const NOTICE_CONNECT_FAILED = "Unable to communicate with Connectix Agent (Antidote).";
const NOTICE_ENABLE_NOVELER = "Enable Antidote Connect in Noveler settings, then open a Noveler document.";

class AntidoteTextZone {
  constructor(text, selectionStart, selectionEnd, id) {
    this.text = String(text || "");
    this.selectionStart = Number(selectionStart) || 0;
    this.selectionEnd = Number(selectionEnd) || 0;
    if (this.selectionEnd < this.selectionStart) {
      [this.selectionStart, this.selectionEnd] = [this.selectionEnd, this.selectionStart];
    }
    this.id = String(id || "0");
  }

  toJsonAPI() {
    return {
      texte: this.text,
      positionSelectionDebut: this.selectionStart,
      positionSelectionFin: this.selectionEnd,
      idZone: this.id,
      zoneEstEnFocus: true
    };
  }
}

class NovelerAntidoteDocument {
  constructor(documentAdapter) {
    this.documentAdapter = documentAdapter;
  }

  getLineBreak() {
    return this.documentAdapter.getLineBreak ? this.documentAdapter.getLineBreak() : "\n";
  }

  getTitle() {
    return this.documentAdapter.getTitle ? this.documentAdapter.getTitle() : "Noveler";
  }

  getPath() {
    return this.documentAdapter.getPath ? this.documentAdapter.getPath() : "";
  }

  getType() {
    return this.documentAdapter.getType ? this.documentAdapter.getType() : "markdown";
  }

  allowsLineBreaks() {
    return true;
  }

  keepsNonBreakingSpaces() {
    return true;
  }

  hasThinSpace() {
    return false;
  }

  async getTextZones() {
    const zones = this.documentAdapter.getZones ? await this.documentAdapter.getZones() : [];
    return zones.map((zone, index) => new AntidoteTextZone(
      zone.text,
      zone.selectionStart,
      zone.selectionEnd,
      zone.id || String(index)
    ));
  }

  canReplace(id, start, end, context) {
    return this.documentAdapter.canReplace
      ? !!this.documentAdapter.canReplace(start, end, context, id)
      : false;
  }

  async replace(id, start, end, replacement) {
    if (!this.documentAdapter.replaceRange) {
      return false;
    }
    return !!(await this.documentAdapter.replaceRange(start, end, replacement, id));
  }

  selectRange(id, start, end) {
    if (this.documentAdapter.selectRange) {
      this.documentAdapter.selectRange(start, end, id);
    }
  }

  focus() {
    if (this.documentAdapter.focus) {
      this.documentAdapter.focus();
    }
  }

  isAvailable() {
    return this.documentAdapter.isAvailable ? !!this.documentAdapter.isAvailable() : false;
  }
}

class AntidoteConnectixSession {
  constructor(document) {
    this.document = document;
    this.prefs = {};
    this.ws = null;
    this.agentProcess = null;
    this.packetParts = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.ws && this.ws.readyState === 1) {
      return true;
    }
    const agentPath = await this.getAgentConsolePath();
    if (!agentPath || !fs.existsSync(agentPath)) {
      throw new Error("Connectix Agent not found");
    }
    this.prefs = await this.readAgentPreferences(agentPath);
    await this.openWebSocket();
    this.initialized = true;
    return true;
  }

  close() {
    this.initialized = false;
    if (this.ws && typeof this.ws.close === "function") {
      this.ws.close();
    }
    this.ws = null;
    if (this.agentProcess && !this.agentProcess.killed) {
      this.agentProcess.kill();
    }
    this.agentProcess = null;
  }

  launchCorrector() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Correcteur" });
  }

  launchDictionary() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Dictionnaires" });
  }

  launchGuide() {
    this.sendConnectixMessage({ message: "LanceOutil", outilApi: "Guides" });
  }

  async getAgentConsolePath() {
    if (process.platform === "win32") {
      const output = execSync('REG QUERY "HKEY_LOCAL_MACHINE\\SOFTWARE\\Druide informatique inc.\\Connectix" /v DossierConnectix', { windowsHide: true }).toString();
      const line = output.split(/\r?\n/).find((item) => item.includes("DossierConnectix")) || "";
      const parts = line.trim().split(/\s{2,}/);
      const folder = parts[parts.length - 1] || "";
      return folder ? path.join(folder, "AgentConnectixConsole.exe") : "";
    }
    if (process.platform === "darwin") {
      const plist = path.join(os.homedir(), "Library/Preferences/com.druide.Connectix.plist");
      const appPath = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :DossierApplication", plist]).toString().trim();
      return appPath ? path.join(appPath, "Contents/SharedSupport/AgentConnectixConsole") : "";
    }
    if (process.platform === "linux") {
      return "/usr/local/bin/AgentConnectixConsole";
    }
    return "";
  }

  readAgentPreferences(agentPath) {
    return new Promise((resolve, reject) => {
      let buffer = "";
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Timed out while reading Connectix Agent preferences"));
        }
      }, 10000);

      this.agentProcess = spawn(agentPath, ["--api"], { windowsHide: true });
      this.agentProcess.stdout.on("data", (chunk) => {
        if (settled) {
          return;
        }
        buffer += chunk.toString("utf8");
        const jsonStart = buffer.indexOf("{");
        if (jsonStart < 0) {
          return;
        }
        try {
          const prefs = JSON.parse(buffer.slice(jsonStart));
          settled = true;
          window.clearTimeout(timeout);
          resolve(prefs);
        } catch (error) {
          // The preferences JSON may arrive in more than one stdout chunk.
        }
      });
      this.agentProcess.on("error", (error) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(error);
        }
      });
      this.agentProcess.stdin.write("API");
    });
  }

  openWebSocket() {
    return new Promise((resolve, reject) => {
      const WebSocketConstructor = typeof WebSocket !== "undefined" ? WebSocket : null;
      if (!WebSocketConstructor) {
        reject(new Error("WebSocket is unavailable in this Obsidian runtime"));
        return;
      }
      this.ws = new WebSocketConstructor(`ws://127.0.0.1:${this.prefs.port}`);
      this.ws.addEventListener("message", (event) => this.receivePacket(event.data));
      this.ws.addEventListener("close", () => {
        this.initialized = false;
      });
      this.ws.addEventListener("open", () => resolve(true));
      this.ws.addEventListener("error", (event) => {
        this.initialized = false;
        reject(event.error || new Error("Connectix WebSocket failed"));
      }, { once: true });
    });
  }

  receivePacket(raw) {
    const text = typeof raw === "string" ? raw : String(raw || "");
    if (!text) {
      return;
    }
    let packet;
    try {
      packet = JSON.parse(text);
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Invalid Connectix packet.", error);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(packet, "idPaquet")) {
      const total = Number(packet.totalPaquet) || 1;
      const index = Math.max(0, (Number(packet.idPaquet) || 1) - 1);
      if (this.packetParts.length < total) {
        this.packetParts = new Array(total);
      }
      this.packetParts[index] = packet.donnees;
      if (this.hasAllPacketParts(total)) {
        const joined = this.packetParts.join("");
        this.packetParts = [];
        try {
          this.handleConnectixMessage(JSON.parse(joined)).catch((error) => console.error(error));
        } catch (error) {
          console.error("[Noveler Antidote Bridge] Invalid Connectix message.", error);
        }
      }
      return;
    }

    this.handleConnectixMessage(packet).catch((error) => console.error(error));
  }

  hasAllPacketParts(total) {
    for (let index = 0; index < total; index += 1) {
      if (this.packetParts[index] === undefined || this.packetParts[index] === "") {
        return false;
      }
    }
    return true;
  }

  async handleConnectixMessage(message) {
    const response = { idMessage: message.idMessage };
    if (message.message === "init") {
      response.titreDocument = this.document.getTitle();
      response.retourChariot = this.document.getLineBreak();
      response.filtreActif = this.document.getType();
      response.permetRetourChariot = this.document.allowsLineBreaks();
      response.permetEspaceInsecable = this.document.keepsNonBreakingSpaces();
      response.permetEspaceFin = this.document.hasThinSpace();
      response.remplaceSansSelection = true;
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "cheminDocument") {
      response.donnee = !this.document.getPath();
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "donneZonesTexte") {
      const zones = await this.document.getTextZones();
      response.donnees = zones.map((zone) => zone.toJsonAPI());
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "docEstDisponible") {
      response.donnees = this.document.isAvailable();
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "editionPossible") {
      const data = message.donnees || {};
      response.donnees = this.document.canReplace(
        data.idZone,
        data.positionDebut,
        data.positionFin,
        data.contexte
      );
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "remplace") {
      const data = message.donnees || {};
      await this.document.replace(
        data.idZone,
        data.positionRemplacementDebut,
        data.positionRemplacementFin,
        data.nouvelleChaine
      );
      this.document.focus();
      response.donnees = true;
      this.sendConnectixResponse(response);
      return;
    }
    if (message.message === "selectionne") {
      const data = message.donnees || {};
      this.document.selectRange(data.idZone, data.positionDebut, data.positionFin);
      return;
    }
    if (message.message === "retourneAuDocument") {
      this.document.focus();
    }
  }

  sendConnectixResponse(response) {
    this.sendConnectixMessage(response);
  }

  sendConnectixMessage(message) {
    if (!this.ws || this.ws.readyState !== 1) {
      return;
    }
    this.ws.send(JSON.stringify({
      idPaquet: 0,
      totalPaquet: 1,
      donnees: JSON.stringify(message)
    }));
  }
}

class NovelerAntidoteBridgePlugin {
  constructor(host) {
    this.host = host;
    this.app = host.app;
    this.manifest = host.manifest;
  }

  addCommand(command) {
    return this.host.addCommand(command);
  }

  addStatusBarItem() {
    return this.host.addStatusBarItem();
  }

  registerDomEvent(...args) {
    return this.host.registerDomEvent(...args);
  }

  registerEvent(eventRef) {
    return this.host.registerEvent(eventRef);
  }

  async onload() {
    this.session = null;
    this.registerApi();
    this.createStatusBarItems();
    this.addCommand({
      id: "noveler-antidote-corrector",
      name: "Noveler Antidote: Correct selection",
      callback: () => this.runCorrector(false)
    });
    this.addCommand({
      id: "noveler-antidote-corrector-all",
      name: "Noveler Antidote: Correct whole document",
      callback: () => this.runCorrector(true)
    });
    this.addCommand({
      id: "noveler-antidote-dictionary",
      name: "Noveler Antidote: Open dictionary",
      callback: () => this.runDictionary()
    });
    this.addCommand({
      id: "noveler-antidote-guide",
      name: "Noveler Antidote: Open guide",
      callback: () => this.runGuide()
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.showOrHideIcons()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.showOrHideIcons()));
    this.registerDomEvent(window, "noveler-settings-changed", () => this.showOrHideIcons());
    if (typeof this.app.workspace.onLayoutReady === "function") {
      this.app.workspace.onLayoutReady(() => this.showOrHideIcons());
    } else {
      window.setTimeout(() => this.showOrHideIcons(), 0);
    }
  }

  onunload() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    if (window.NovelerAntidoteBridge && window.NovelerAntidoteBridge.plugin === this) {
      delete window.NovelerAntidoteBridge;
    }
  }

  registerApi() {
    window.NovelerAntidoteBridge = {
      plugin: this,
      isEnabled: () => this.isEnabled(),
      correct: () => this.runCorrector(false),
      correctAll: () => this.runCorrector(true),
      dictionary: () => this.runDictionary(),
      guide: () => this.runGuide()
    };
  }

  createStatusBarItems() {
    this.correctAllStatusBar = this.createStatusIcon("check-circle", "Antidote: Correct whole Noveler document", () => this.runCorrector(true));
    this.correctStatusBar = this.createStatusIcon("check", "Antidote: Correct Noveler selection", () => this.runCorrector(false));
    this.dictionaryStatusBar = this.createStatusIcon("book", "Antidote: Dictionary", () => this.runDictionary());
    this.guideStatusBar = this.createStatusIcon("book-open", "Antidote: Guide", () => this.runGuide());
    this.showOrHideIcons();
  }

  createStatusIcon(icon, label, onClick) {
    const item = this.addStatusBarItem();
    item.addClass("mod-clickable", "noveler-antidote-status");
    item.createSpan({ attr: { "aria-label-position": "top", "aria-label": label } }, (span) => setIcon(span, icon));
    item.onClickEvent(onClick);
    return item;
  }

  showOrHideIcons() {
    const visible = this.isEnabled() && this.isNovelerActive();
    for (const item of [this.correctAllStatusBar, this.correctStatusBar, this.dictionaryStatusBar, this.guideStatusBar]) {
      if (!item) {
        continue;
      }
      if (visible) {
        item.removeClass("hide");
      } else {
        item.addClass("hide");
      }
    }
  }

  isNovelerActive() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return !!(view && typeof view.getViewType === "function" && view.getViewType() === NOVELER_VIEW_TYPE);
  }

  getNovelerApi() {
    return typeof window !== "undefined" && window.Noveler ? window.Noveler : null;
  }

  isEnabled() {
    const noveler = this.getNovelerApi();
    return !!(noveler && typeof noveler.isAntidoteConnectEnabled === "function" && noveler.isAntidoteConnectEnabled());
  }

  createDocument(checkWholeDocument) {
    const noveler = this.getNovelerApi();
    if (!noveler || typeof noveler.createAntidoteDocument !== "function" || !this.isEnabled()) {
      return null;
    }
    const adapter = noveler.createAntidoteDocument({ checkWholeDocument });
    return adapter ? new NovelerAntidoteDocument(adapter) : null;
  }

  async runCorrector(checkWholeDocument) {
    const document = this.createDocument(checkWholeDocument);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchCorrector();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch corrector.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async runDictionary() {
    const document = this.createDocument(false);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchDictionary();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch dictionary.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async runGuide() {
    const document = this.createDocument(false);
    if (!document) {
      new Notice(NOTICE_ENABLE_NOVELER);
      return;
    }
    try {
      await this.startSession(document);
      this.session.launchGuide();
    } catch (error) {
      console.error("[Noveler Antidote Bridge] Could not launch guide.", error);
      new Notice(NOTICE_CONNECT_FAILED);
    }
  }

  async startSession(document) {
    if (this.session) {
      this.session.close();
    }
    this.session = new AntidoteConnectixSession(document);
    await this.session.initialize();
  }
}

module.exports = NovelerAntidoteBridgePlugin;
