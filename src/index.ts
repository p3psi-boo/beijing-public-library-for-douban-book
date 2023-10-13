namespace Constant {
    export const ISBN_INDEX = -3;
    export const BASE_URL = "https://primo.clcn.net.cn/primo_library/libweb/action/"
    export const ICON_EXTERN = `<svg t="1697200936413" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5571" width="16" height="16"><path d="M764.1 871.9h-612v-612h242v100h-142v412h412v-142h100z" p-id="5572" fill="#0b7c2a"></path><path d="M355.736 597.38l350.58-350.58 70.71 70.71-350.58 350.58z" p-id="5573" fill="#0b7c2a"></path><path d="M871.9 500.9l-97 24.3-41.1-164.3-14.2-56.5-56.6-14.2-164.2-41.1 24.4-97 279 69.7z" p-id="5574" fill="#0b7c2a"></path></svg>`
}

interface IBasicInfo {
    detailURL: string
    libName: string
    area: string
    cite: string
}

const baseRequest = (url: string, params: Record<string, any> = {}): Promise<string> => {
    return new Promise((resolve, reject) => {

        const paramsString = Object.entries(params).map(pair => `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1])}`).join('&')
        const fullURL = ((url) => {
            let result = Constant.BASE_URL + url;
            if (paramsString.length != 0) {
                result += '?'
                result += paramsString
            }
            return result;
        })(url)

        // @ts-ignore
        GM_xmlhttpRequest({
            headers: {
                'content-type': 'application/json',
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
            },
            responseType: 'xml',
            url: fullURL,
            method: 'GET',
            onload: function (res) {
                resolve(res.response as string)
            },
            onerror: function (response) {
                reject(response)
            }
        })
    })
}


namespace Bussiness {

    export namespace Search {

        export const getUrl = (isbn: string) => {
            const params = {
                "fn": "search",
                "ct": "search",
                "initialSearch": "true",
                "mode": "Basic",
                "tab": "default_tab",
                "indx": "1",
                "dum": "true",
                "srt": "rank",
                "vid": "CLCN",
                "frbg": "",
                "vl(freeText0)": isbn,
                "scp.scps": "scope:(CLCN),scope:(CLCN_EBOOK)",
                "vl(26371699UI0)": "isbn",
            }
            const paramsString = Object.entries(params).map(pair => `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1])}`).join('&')
            const fullURL = ((url) => {
                let result = Constant.BASE_URL + url;
                if (paramsString.length != 0) {
                    result += '?'
                    result += paramsString
                }
                return result;
            })("search.do")
            return fullURL;
        }

        // @ts-ignore
        export const request = async (isbn: string) => {
            const response = await baseRequest("search.do", {
                "fn": "search",
                "ct": "search",
                "initialSearch": "true",
                "mode": "Basic",
                "tab": "default_tab",
                "indx": "1",
                "dum": "true",
                "srt": "rank",
                "vid": "CLCN",
                "frbg": "",
                "vl(freeText0)": isbn,
                "scp.scps": "scope:(CLCN),scope:(CLCN_EBOOK)",
                "vl(26371699UI0)": "isbn",
            })
            const dom = new DOMParser().parseFromString(response, "text/html")
            const idElemList = dom.getElementsByClassName("EXLResultRecordId")
            const result: string[] = []

            for (const el of idElemList) {
                const id = el!.getAttribute("name")
                result.push(id!)
            }
            return result;
        }
    }

    export namespace Library {
        export const getAvailLibraries = async (id: string, isbn: string) => {
            const res = await baseRequest("display.do", {
                "tabs": "locationsTab",
                "ct": "display",
                "fn": "search",
                "doc": id,
                "indx": "1",
                "recIds": id,
                "recIdxs": "0",
                "elementId": "",
                "renderMode": "poppedOut",
                "displayMode": "full",
                "https://primo.clcn.net.cn:443/primo_library/libweb/action/expand.do?frbg": "",
                "frbrVersion": "2",
                "vl(26371699UI0)": "isbn",
                "gathStatTab": "true",
                "dscnt": "1",
                "scp.scps": "scope:(CLCN),scope:(CLCN_EBOOK)",
                "mode": "Basic",
                "vid": "CLCN",
                "tab": "default_tab",
                "srt": "rank",
                "dum": "true",
                "vl(freeText0)": isbn,
                "fromTabHeaderButtonPopout": "true",
                "dstmp": (new Date()).valueOf() - 10 * 1000,
            })

            const result: IBasicInfo[] = []

            const dom = new DOMParser().parseFromString(res, "text/html")
            const items = $(".EXLLocationList", dom)
            items.each(function () {
                const detailURL = $(".EXLLocationsIcon", this).attr("href")!
                const libName = $(".EXLLocationsTitleContainer", this).text().trim()
                const metaContainer = $(".EXLLocationInfo", this)
                const area = $("strong", metaContainer).text().trim()
                const cite = $("cite", metaContainer).text().trim()
                result.push({
                    detailURL,
                    libName,
                    area,
                    cite
                })
            })
            return result
        }

        export const GetAvailNum = async (info: IBasicInfo) => {
            let result = 0;
            const res = await baseRequest(info.detailURL)
            const stateList = $(res).find(".EXLLocationTableColumn3")

            stateList.each(function () {
                if (this.innerText.includes("在架上")) {
                    result++;
                }
            })
            return result;
        }
    }


    export namespace Draw {

        export const drawBase = (isbn: string) => {
            const container = $("<div class='gray_ad'></div>")
            const searchUrl = Bussiness.Search.getUrl(isbn)
            container.append($(`
                <h2 style="display: inline-flex; justify-content: space-between; width: 100%">
                    <span>北京公共图书馆馆藏</span>
                    <span style="cursor: pointer" onclick="window.open('${searchUrl}','_blank');">${Constant.ICON_EXTERN}</span>
                </h2>
            `))
            container.append($("<div id='load-label' style='display: flex; justify-content: center;align-items: center; margin: 16px 32px 32px 16px'>加载中...</div>"))
            container.append($("<span id='bj-db-plug-tips' style='color: #666666; font-size: 12px'>检索信息是根据本页的 ISBN 号进行匹配，如遇到没有查询结果可手动根据书名进行<a href='https://primo.clcn.net.cn/primo_library/libweb/action/search.do' target='_blank'>相关查询</a>。</span>"))
            $(".aside").prepend(container)
            return container;
        }

        export const draw = (libList: IBasicInfo[]) => {
            const list = $("<ul class='bs more-after'></ul>")
            libList.forEach((item) => {
                list.append(`
                <li class="mb8 pl" style="border: none; border-bottom: 1px solid rgba(0,0,0,.08); margin-top: 6px" id="${item.libName}">
                    <div class="meta-wrapper">
                        <div class="meta">
                            <div style="display: flex; justify-content: space-between;"><span style="color: #37a">${item.libName}</span><span id="avail-label">加载中</span></div>
                            <div style="display: flex; flex-direction: column;">
                                <span>馆藏地：${item.area} </span>
                                <span>索书号：${item.cite} </span>
                            </div>
                        </div>
                    </div>
                </li>
                `)
            })
            // container.append(list)
            list.insertBefore($("#bj-db-plug-tips"))
        }
    }
}

function getISBN() {
    const isbn = $("meta[property='book:isbn']").attr("content");
    return isbn!
}


async function main() {
    const isbn = getISBN()
    const container = Bussiness.Draw.drawBase(isbn!);
    try {
        const searchResult = await Bussiness.Search.request(isbn!)
        container.children("#load-label").remove()
        for (const id of searchResult) {
            var result = await Bussiness.Library.getAvailLibraries(id, isbn!)
            Bussiness.Draw.draw(result)
            result.forEach(info => {
                Bussiness.Library.GetAvailNum(info).then(res => {
                    const parent = $(`#${info.libName}`, container)
                    const labelElem = $("#avail-label", parent)
                    labelElem.text(`在架${res}本`)
                }).catch(err => {
                    const parent = $(`#${info.libName}`, container)
                    const labelElem = $("#avail-label", parent)
                    labelElem.text()
                })
            })
        }
    } catch {
        $("#load-label").text("获取信息失败")
    }

}