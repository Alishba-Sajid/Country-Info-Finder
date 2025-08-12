const CORS_PROXY = "https://corsproxy.io/?";
const SERVICE_URL = "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso";

async function soapRequest(action, body) {
    const xmlEnvelope = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:web="http://www.oorsprong.org/websamples.countryinfo">
            <soapenv:Header/>
            <soapenv:Body>
                ${body}
            </soapenv:Body>
        </soapenv:Envelope>
    `;

    const response = await fetch(CORS_PROXY + encodeURIComponent(SERVICE_URL), {
        method: "POST",
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "http://www.oorsprong.org/websamples.countryinfo/" + action
        },
        body: xmlEnvelope
    });

    const text = await response.text();
    return new window.DOMParser().parseFromString(text, "text/xml");
}

async function getCountryInfo() {
    const countryName = document.getElementById("countryInput").value.trim();
    const resultDiv = document.getElementById("result");

    if (!countryName) {
        resultDiv.innerHTML = "<p style='color:red;'><i class='fa-solid fa-triangle-exclamation'></i> Please enter a country name.</p>";
        return;
    }

    // Show loading spinner
    resultDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:36px; color:#0078ff;"></i>
            <p style="color:#666;">Fetching country info...</p>
        </div>
    `;

    try {
        const isoXml = `<web:CountryISOCode><web:sCountryName>${countryName}</web:sCountryName></web:CountryISOCode>`;
        const isoDoc = await soapRequest("CountryISOCode", isoXml);
        const isoCode = isoDoc.getElementsByTagName("m:CountryISOCodeResult")[0]?.textContent;

        if (!isoCode) throw new Error("Country not found");

        const fullXml = `<web:FullCountryInfo><web:sCountryISOCode>${isoCode}</web:sCountryISOCode></web:FullCountryInfo>`;
        const fullDoc = await soapRequest("FullCountryInfo", fullXml);

        const capital = fullDoc.getElementsByTagName("m:sCapitalCity")[0]?.textContent || "N/A";
        const flagUrl = fullDoc.getElementsByTagName("m:sCountryFlag")[0]?.textContent || "";

        let languages = [];
        const langNodes = fullDoc.querySelectorAll("tLanguage, m\\:tLanguage, web\\:tLanguage");
        langNodes.forEach(langNode => {
            const langName = langNode.querySelector("sName, m\\:sName, web\\:sName")?.textContent;
            if (langName) languages.push(langName);
        });

        const phoneXml = `<web:CountryIntPhoneCode><web:sCountryISOCode>${isoCode}</web:sCountryISOCode></web:CountryIntPhoneCode>`;
        const phoneDoc = await soapRequest("CountryIntPhoneCode", phoneXml);
        const phoneCode = phoneDoc.getElementsByTagName("m:CountryIntPhoneCodeResult")[0]?.textContent || "N/A";

        
        resultDiv.innerHTML = `
            <h2><i class="fa-solid fa-flag"></i> ${countryName} (${isoCode})</h2>
            ${flagUrl ? `<img src="${flagUrl}" alt="Flag of ${countryName}" width="120">` : ""}
            <p><i class="fa-solid fa-landmark"></i> Capital: ${capital}</p>
            <p><i class="fa-solid fa-phone"></i> Phone Code: +${phoneCode}</p>
            <p><i class="fa-solid fa-language"></i> Languages: ${languages.length ? languages.join(", ") : "N/A"}</p>
        `;
    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = "<p style='color:red;'><i class='fa-solid fa-circle-xmark'></i> Country not found. Please try again.</p>";
    }
}
