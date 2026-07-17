const fieldDefinitions = [
  ["income", "月收入", "每月實際可運用的稅後收入", true],
  ["fixedExpenses", "月固定支出", "房租、生活費、訂閱等固定開銷", true],
  ["monthlyInvestment", "月投資金額", "定期定額、退休金與其他投資"],
  ["cashSavings", "現金存款", "活存、定存等可快速動用的資金"],
  ["investmentAssets", "投資資產", "股票、基金、債券等目前市值"],
  ["totalDebt", "信貸／車貸／房貸總額", "目前所有未償還貸款餘額"],
  ["monthlyDebt", "每月債務支出", "每月需繳的貸款本金與利息", true],
  ["annualPremium", "保險年繳保費", "一年合計繳納的所有保費"],
];

const levelText = {
  "危險": "財務承受力偏低，建議先處理現金流與債務壓力。",
  "需改善": "已有部分基礎，調整幾個關鍵習慣就能明顯改善。",
  "穩定": "整體結構穩定，可進一步強化風險準備與投資效率。",
  "良好": "財務體質良好，請持續定期檢視並配合人生目標調整。",
};

const form = document.querySelector("#assessmentForm");
const fieldsRoot = document.querySelector("#financialFields");
const resultRoot = document.querySelector("#result");
let hasEmergencyFund = false;
let latestResult = null;

fieldsRoot.innerHTML = fieldDefinitions.map(([key, label, hint, required]) => `
  <label class="field">
    <span>${label}${required ? "<b>必填</b>" : ""}</span>
    <div class="money-input"><span>NT$</span><input name="${key}" inputmode="numeric" min="0" step="1" type="number" placeholder="0" ${required ? "required" : ""}></div>
    <small>${hint}</small><small class="error" data-error="${key}" hidden>請輸入大於 0 的金額</small>
  </label>`).join("");

const numberValue = (name) => Number(new FormData(form).get(name)) || 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function updateProgress() {
  const count = fieldDefinitions.filter(([key]) => numberValue(key) > 0).length + (hasEmergencyFund ? 1 : 0);
  document.querySelector("#progress").textContent = `${count} / 9 已填寫`;
}

function updateOccupationFields() {
  const isLabor = form.elements.occupation.value === "勞工";
  document.querySelectorAll(".labor-only").forEach((field) => field.hidden = !isLabor);
}

document.querySelectorAll("[data-emergency]").forEach((button) => {
  button.addEventListener("click", () => {
    hasEmergencyFund = button.dataset.emergency === "yes";
    document.querySelectorAll("[data-emergency]").forEach((item) => {
      const active = (item.dataset.emergency === "yes") === hasEmergencyFund;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updateProgress();
  });
});

form.addEventListener("input", updateProgress);
form.elements.occupation.addEventListener("change", updateOccupationFields);
updateOccupationFields();

function calculate() {
  const income = numberValue("income");
  const expenses = numberValue("fixedExpenses");
  const investment = numberValue("monthlyInvestment");
  const cash = numberValue("cashSavings");
  const monthlyDebt = numberValue("monthlyDebt");
  const totalDebt = numberValue("totalDebt");
  const monthlyPremium = numberValue("annualPremium") / 12;
  const essentialOutflow = expenses + monthlyDebt + monthlyPremium;
  const savingsRate = income ? ((income - essentialOutflow) / income) * 100 : 0;
  const debtIncomeRatio = income ? (monthlyDebt / income) * 100 : 0;
  const investmentRate = income ? (investment / income) * 100 : 0;
  const emergencyMonths = essentialOutflow ? cash / essentialOutflow : cash > 0 ? 12 : 0;
  const score = Math.round(
    clamp((savingsRate / 20) * 30, 0, 30) +
    clamp(((50 - debtIncomeRatio) / 35) * 25, 0, 25) +
    clamp((investmentRate / 15) * 20, 0, 20) +
    clamp((emergencyMonths / 6) * 20, 0, 20) +
    (hasEmergencyFund ? 5 : 0)
  );
  const level = score < 40 ? "危險" : score < 60 ? "需改善" : score < 80 ? "穩定" : "良好";

  const priorities = [];
  if (savingsRate < 10) priorities.push([savingsRate < 0 ? 100 : 84, savingsRate < 0 ? "先讓每月現金流轉正：檢視固定支出，設定一項可立即削減的開銷。" : "把儲蓄率逐步提高到 20%，可先設定薪資入帳日自動轉存。"]);
  if (debtIncomeRatio > 35) priorities.push([96, "每月債務負擔偏高，優先償還利率較高的貸款，並避免新增非必要負債。"]);
  else if (debtIncomeRatio > 20) priorities.push([72, "將每月債務支出控制在收入 20% 以下，評估提前償還高利率貸款。"]);
  if (!hasEmergencyFund || emergencyMonths < 3) priorities.push([92, "先建立至少 3 個月必要支出的緊急預備金，並放在高流動性的獨立帳戶。"]);
  else if (emergencyMonths < 6) priorities.push([65, "緊急預備金已有基礎，可持續補足到 6 個月必要支出。"]);
  if (investmentRate < 10) priorities.push([55, "現金流穩定後，將投資率逐步提高到月收入 10%–15%，並維持分散配置。"]);
  if (income && totalDebt > income * 36) priorities.push([70, "總貸款餘額較高，建議盤點利率與年限，建立清楚的還款優先順序。"]);
  if (monthlyPremium > income * .15) priorities.push([60, "年繳保費占收入較高，可請專業顧問檢視保障是否重複或保費負擔過重。"]);
  priorities.push([40, "每半年重新評測一次，確認收入、支出與資產配置仍符合目前的人生目標。"], [35, "為短、中、長期目標分開準備資金，避免臨時需求打亂投資計畫。"], [30, "檢視保險保障內容與受益人設定，確認保障額度符合家庭責任。"]);

  const currentAge = numberValue("currentAge");
  const startWorkAge = numberValue("startWorkAge");
  const retireAge = numberValue("retireAge");
  const yearsToRetirement = Math.max(retireAge - currentAge, 0);
  const workingYears = Math.max(retireAge - startWorkAge, 0);
  const occupation = form.elements.occupation.value;
  const pensionSystem = occupation === "勞工" ? form.elements.pensionSystem.value : "依身分另行確認";
  const retirementStatus = yearsToRetirement > 20 ? "尚有時間建立退休基礎" : yearsToRetirement >= 10 ? "已進入加速準備期" : "需要優先完成退休盤點";
  const retirementSuggestions = [yearsToRetirement < 10 ? "距離預計退休不到 10 年，建議優先盤點退休後每月生活費、可用資產與穩定收入來源。" : "先設定退休後每月生活費目標，再以剩餘年限反推每月需要累積的退休資金。"];
  if (occupation === "勞工" && numberValue("pensionAccount") <= 0) retirementSuggestions.push("登入勞保局 e 化服務系統，確認你的勞退個人專戶累積金額與提繳異動資料。");
  if (occupation === "勞工" && numberValue("selfContribution") <= 0) retirementSuggestions.push("可依目前現金流與稅務情況，評估勞退自願提繳是否適合你，不必直接以最高比例為目標。");
  if (occupation !== "勞工") retirementSuggestions.push("不同職業適用的退休制度與給付規則不同，深入分析時應以主管機關資料及個人年資為準。");
  retirementSuggestions.push("每年至少更新一次薪資、年資、退休帳戶與投資資產，避免退休目標與實際進度脫節。");

  return { savingsRate, debtIncomeRatio, investmentRate, emergencyMonths, score, level, suggestions: priorities.sort((a, b) => b[0] - a[0]).slice(0, 3).map((item) => item[1]), retirement: { yearsToRetirement, workingYears, occupation, pensionSystem, status: retirementStatus, suggestions: retirementSuggestions.slice(0, 3) } };
}

function render(result) {
  latestResult = result;
  resultRoot.hidden = false;
  resultRoot.className = `results level-${result.level}`;
  document.querySelector("#score").textContent = result.score;
  document.querySelector("#level").textContent = result.level;
  document.querySelector("#levelText").textContent = levelText[result.level];
  const metrics = [["儲蓄率", result.savingsRate, "%", "建議 20% 以上"], ["負債收入比", result.debtIncomeRatio, "%", "建議低於 20%"], ["投資率", result.investmentRate, "%", "建議 10% 以上"], ["緊急預備金", result.emergencyMonths, " 個月", "建議 3–6 個月"]];
  document.querySelector("#metricGrid").innerHTML = metrics.map(([label, value, unit, benchmark]) => `<article class="metric"><p>${label}</p><strong>${value.toFixed(1)}<span>${unit}</span></strong><small>${benchmark}</small></article>`).join("");
  document.querySelector("#suggestions").innerHTML = result.suggestions.map((item, index) => `<li><span>0${index + 1}</span><p>${item}</p></li>`).join("");
  document.querySelector("#retirementStatus").textContent = result.retirement.status;
  document.querySelector("#retirementFacts").innerHTML = `<article><small>距離預計退休</small><strong>${result.retirement.yearsToRetirement}<span> 年</span></strong></article><article><small>預計總工作年資</small><strong>${result.retirement.workingYears}<span> 年</span></strong></article><article><small>目前盤點制度</small><strong class="text-value">${result.retirement.occupation}<span>· ${result.retirement.pensionSystem}</span></strong></article>`;
  document.querySelector("#retirementSuggestions").innerHTML = result.retirement.suggestions.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#reportDate").textContent = `產出日期：${new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date())}`;
  resultRoot.scrollIntoView({ behavior: "smooth", block: "start" });
}

function reportText(result) {
  return [
    "briansharelife 基本財務評測報告",
    `產出日期：${new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date())}`,
    "",
    `財務健康分數：${result.score} / 100`,
    `財務健康等級：${result.level}`,
    levelText[result.level],
    "",
    "四項關鍵指標",
    `- 儲蓄率：${result.savingsRate.toFixed(1)}%`,
    `- 負債收入比：${result.debtIncomeRatio.toFixed(1)}%`,
    `- 投資率：${result.investmentRate.toFixed(1)}%`,
    `- 緊急預備金：${result.emergencyMonths.toFixed(1)} 個月`,
    "",
    "三項優先改善建議",
    ...result.suggestions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "退休準備初步盤點",
    `- ${result.retirement.status}`,
    `- 距離預計退休：${result.retirement.yearsToRetirement} 年`,
    `- 預計總工作年資：${result.retirement.workingYears} 年`,
    `- 目前盤點制度：${result.retirement.occupation} · ${result.retirement.pensionSystem}`,
    ...result.retirement.suggestions.map((item) => `- ${item}`),
    "",
    "重要提醒：本工具僅供初步財務檢視，不構成投資、保險或法律建議。",
    "預約 RFA 深入分析：https://brian10541-art.github.io/brian-rfa/#booking",
  ].join("\n");
}

document.querySelector("#emailReportButton").addEventListener("click", () => {
  if (!latestResult) return;
  const emailInput = document.querySelector("#reportEmail");
  const message = document.querySelector("#reportActionMessage");
  if (!emailInput.value || !emailInput.checkValidity()) {
    message.textContent = "請先輸入有效的 Email 地址。";
    message.classList.add("error-message");
    emailInput.focus();
    return;
  }
  message.classList.remove("error-message");
  message.textContent = "正在開啟你的郵件 App；請確認內容後再寄出。";
  const subject = encodeURIComponent(`briansharelife 基本財務評測報告｜${latestResult.level} ${latestResult.score} 分`);
  const body = encodeURIComponent(reportText(latestResult));
  window.location.href = `mailto:${encodeURIComponent(emailInput.value.trim())}?subject=${subject}&body=${body}`;
});

document.querySelector("#pdfReportButton").addEventListener("click", () => {
  if (!latestResult) return;
  const originalTitle = document.title;
  const date = new Date().toISOString().slice(0, 10);
  document.title = `briansharelife-基本財務評測-${date}`;
  document.querySelector("#reportActionMessage").textContent = "請在列印畫面選擇「儲存為 PDF」。";
  const restoreTitle = () => { document.title = originalTitle; window.removeEventListener("afterprint", restoreTitle); };
  window.addEventListener("afterprint", restoreTitle);
  window.print();
  window.setTimeout(() => { document.title = originalTitle; }, 1500);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const incomeValid = numberValue("income") > 0;
  const expensesValid = numberValue("fixedExpenses") > 0;
  const debtValid = numberValue("monthlyDebt") >= 0 && form.elements.monthlyDebt.value !== "";
  document.querySelector('[data-error="income"]').hidden = incomeValid;
  document.querySelector('[data-error="fixedExpenses"]').hidden = expensesValid;
  document.querySelector('[data-error="monthlyDebt"]').hidden = debtValid;
  const ageValid = numberValue("retireAge") > numberValue("currentAge");
  document.querySelector(".age-error").hidden = ageValid;
  if (!incomeValid || !expensesValid || !debtValid || !ageValid) return;
  render(calculate());
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset(); hasEmergencyFund = false; latestResult = null; resultRoot.hidden = true;
  document.querySelector("#reportActionMessage").textContent = "";
  document.querySelectorAll("[data-emergency]").forEach((item) => { const active = item.dataset.emergency === "no"; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
  updateOccupationFields(); updateProgress(); window.scrollTo({ top: 0, behavior: "smooth" });
});
