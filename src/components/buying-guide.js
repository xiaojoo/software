class BuyingGuide extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="guide-intro"><div class="guide-copy"><h2>安装前，先了解项目的版本信息。</h2><p>阅读版本说明，并选择适合你设备的安装包。每个软件详情页都提供对应仓库链接。</p></div><div class="guide-photo" role="img" aria-label="团队一起查看软件"><span class="photo-caption">每个项目均提供源代码和版本下载链接</span></div></div>
      <ol class="guide-steps">${['选择软件项目', '打开最新版本', '确认设备兼容性', '阅读版本说明', '下载对应安装包'].map((step, index) => `<li><span>${index + 1}</span><strong>${step}</strong></li>`).join('')}</ol>
      `;
  }
}
customElements.define('buying-guide', BuyingGuide);
