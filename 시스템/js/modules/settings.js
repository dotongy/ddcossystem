import { supabase } from "../supabase.js";
import { $ } from "../utils.js";

/**
 * @file settings.js
 * @description 회사 정보 및 은행 정보 설정을 관리하는 모듈
 */
export const SettingsApp = {
  form: null,
  messageEl: null,
  saveBtn: null,

  setup() {
    this.form = $("#settings-form");
    this.messageEl = $("#settings-message");
    this.saveBtn = $("#settings-save-btn");
  },

  async init() {
    console.log("SettingsApp: Initializing...");
    this.setup();

    if (this.form && !this.form.dataset.initialized) {
      this.form.addEventListener("submit", this.save.bind(this));
      this.form.dataset.initialized = "true";
    }

    await this.loadSettings();
  },

  async loadSettings() {
    try {
      // 설정은 항상 id 1인 row에 저장한다고 가정
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (error && error.code !== "PGRST116") throw error; // "row not found" 에러는 무시

      if (data) {
        for (const key in data) {
          const input = this.form.querySelector(`[name="${key}"]`);
          if (input) {
            input.value = data[key];
          }
        }
      }
    } catch (e) {
      console.error("Error loading settings:", e);
      alert("설정 정보를 불러오는 데 실패했습니다.");
    }
  },

  async save(e) {
    e.preventDefault();
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = "저장 중...";
    this.messageEl.classList.add("hidden");

    const formData = new FormData(this.form);
    const settingsData = Object.fromEntries(formData.entries());
    settingsData.id = 1; // 항상 id 1인 row를 업데이트 (upsert)

    try {
      const { error } = await supabase
        .from("company_settings")
        .upsert(settingsData);
      if (error) throw error;

      this.messageEl.textContent = "설정이 성공적으로 저장되었습니다.";
      this.messageEl.classList.remove("hidden", "bg-red-100", "text-red-700");
      this.messageEl.classList.add("bg-green-100", "text-green-700");
    } catch (error) {
      console.error("Error saving settings:", error);
      this.messageEl.textContent = `저장 실패: ${error.message}`;
      this.messageEl.classList.remove(
        "hidden",
        "bg-green-100",
        "text-green-700",
      );
      this.messageEl.classList.add("bg-red-100", "text-red-700");
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = "Save Settings";
    }
  },
};
