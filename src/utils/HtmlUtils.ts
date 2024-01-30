export class HtmlUtils {
    static generateExitToInstallPage(shop: string): string {
        const html = this.generateAppBridgePage({
            script: `
        (async => {
            console.log('test');
            var url = 'https://redirectutil.cloudshelf.ai/?path=' + encodeURIComponent('https://development.shopifyconnector.cloudshelf.ai/shopify/offline/auth?shop=${shop}');
            open(url, '_top');
        })()
        `,
        });

        return html;
    }
    static generateAppBridgePage(options?: { loadingText?: string; script?: string }): string {
        return `
    <html>
    <head>
        <meta name="shopify-api-key" content="${process.env.SHOPIFY_API_KEY}" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" ></script>
        <script>
            //restart the loading on the parent window
            shopify.loading(false); 
            shopify.loading(true); 
            ${options?.script ? `${options.script}` : ''}
        </script>
        <style>
            body {
                background: linear-gradient(120deg, #EC516C 8.16%, #EC9D51 119.67%);
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 20px;
            }
            p {
                color: #fff;
                font-family: 'Roboto', sans-serif;
                font-size: 20px;
            }
            .text {
                text-align: center;
            }
            .lds-roller {
              display: inline-block;
              position: relative;
              width: 80px;
              height: 80px;
            }
            .lds-roller div {
              animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
              transform-origin: 40px 40px;
            }
            .lds-roller div:after {
              content: " ";
              display: block;
              position: absolute;
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: #fff;
              margin: -4px 0 0 -4px;
            }
            .lds-roller div:nth-child(1) {
              animation-delay: -0.036s;
            }
            .lds-roller div:nth-child(1):after {
              top: 63px;
              left: 63px;
            }
            .lds-roller div:nth-child(2) {
              animation-delay: -0.072s;
            }
            .lds-roller div:nth-child(2):after {
              top: 68px;
              left: 56px;
            }
            .lds-roller div:nth-child(3) {
              animation-delay: -0.108s;
            }
            .lds-roller div:nth-child(3):after {
              top: 71px;
              left: 48px;
            }
            .lds-roller div:nth-child(4) {
              animation-delay: -0.144s;
            }
            .lds-roller div:nth-child(4):after {
              top: 72px;
              left: 40px;
            }
            .lds-roller div:nth-child(5) {
              animation-delay: -0.18s;
            }
            .lds-roller div:nth-child(5):after {
              top: 71px;
              left: 32px;
            }
            .lds-roller div:nth-child(6) {
              animation-delay: -0.216s;
            }
            .lds-roller div:nth-child(6):after {
              top: 68px;
              left: 24px;
            }
            .lds-roller div:nth-child(7) {
              animation-delay: -0.252s;
            }
            .lds-roller div:nth-child(7):after {
              top: 63px;
              left: 17px;
            }
            .lds-roller div:nth-child(8) {
              animation-delay: -0.288s;
            }
            .lds-roller div:nth-child(8):after {
              top: 56px;
              left: 12px;
            }
            @keyframes lds-roller {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }

        </style>
    </head>
    <body>
        <img src="https://imagedelivery.net/-f5bUQJUthKVRJ-ta9_Rcg/cb9b019f-6b04-41f9-be79-62c856668700/w=100,h=100,fit=scale-down,sharpen=1" alt="Cloudshelf" width="243px"/>
      
        <div class="lds-roller">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        
        <div class="text">
         <p>
            Please wait a moment
            ${options?.loadingText ? `<br/>${options.loadingText}` : ''}
         </p>
        </div>
    </body>
    </html>`;
    }
}
