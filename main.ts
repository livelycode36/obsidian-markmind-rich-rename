import {Notice, Plugin, TAbstractFile, TFile, TFolder} from 'obsidian';
import {debugLog} from "./src/log";
import {path} from "./src/path";
import {getMetadata, Metadata} from 'src/metadata';
import * as marked from "marked";

export default class MarkmindRenamePlugin extends Plugin {
	async onload() {
		this.registerEvent(
			// 在重命名文件夹时触发重命名事件，重命名文件夹中的每个文件/文件夹（包括其本身）都将触发该事件
			this.app.vault.on("rename", async (file: TAbstractFile, oldPath: string) => {
				this.renameEventProcessor(file, oldPath);
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
	}

	async saveSettings() {
		// await this.saveData(this.settings);
	}

	private renameEventProcessor(newTFile: TAbstractFile | TFile, oldPath: string) {
		if (newTFile instanceof TFile) {
			let newFile = getMetadata(newTFile.path);
			let oldFile = getMetadata(oldPath)
			let renameData = {newTFile, newFile, oldFile, isUpdate: false}

			if (
				path.basename(oldPath, path.extname(oldPath)) ===
				path.basename(newTFile.path, path.extname(newTFile.path))
			) {
				// 拖拽文件
				debugLog("拖拽文件、重命名文件夹中的文件")
				this.updateMarkmindLinkByRenameEvent(renameData);
			} else {
				// 重命名文件事件
				debugLog("单重命名文件")
				this.updateMarkmindLinkByRenameEvent(renameData);
			}
		} else if (newTFile instanceof TFolder) {
			// 重命名文件夹事件
			// 会触发 rename事件，此处可以不处理
		}
	}

	/** 更新markmind中的链接 */
	private updateMarkmindLinkByRenameEvent(renameData: {
		newTFile: TFile,
		newFile: Metadata;
		oldFile: Metadata;
		isUpdate: boolean
	}) {
		let {newTFile} = renameData

		let markdownFiles = this.app.vault.getMarkdownFiles();

		// 判断是否md文件
		debugger
		if (newTFile.extension == "md") {
			this.app.fileManager.processFrontMatter(newTFile, frontmatter => {
				// 当前重命名的是markmind文件，且是rich模式
				// markmind改名，更新markdown中的 markmind节点链接
				if (this.isMarkmindRich(frontmatter)) {
					debugLog("重命名的是 markmind文件的rich模式")
					markdownFiles.forEach((mdFile) => {
						this.app.vault.process(mdFile, content => {
							content = this.markmindLinkProcessor(content, renameData)
							if (renameData.isUpdate) {
								new Notice(`${mdFile.path}中的链接已更新！`)
							}
							// 没有匹配到正则，直接返回
							return content
						}).catch((error) => {
							debugLog("error:", error)
						})
					})
				} else {
					debugLog("重命名的是 普通文件")
					this.updateMarkmindLink(renameData);
				}
			}).catch((error) => {
				debugLog("error:", error)
			})
			// 不是md文件（pdf、jpg等）
		} else {
			this.updateMarkmindLink(renameData);
		}

	}

	/** 流程：更新markmind中链接的流程 */
	private updateMarkmindLink(renameData: {
		newTFile: TFile;
		newFile: Metadata;
		oldFile: Metadata;
		isUpdate: boolean
	}) {
		let markdownFiles = this.app.vault.getMarkdownFiles();

		// 普通文件改名，更新markmind中的 双链链接
		markdownFiles.forEach((currentMdFile) => {
			// 更新markmind中的链接
			this.app.fileManager.processFrontMatter(currentMdFile, frontmatter => {
				// 更新markmind中的链接
				// 找到markmind文件
				if (this.isMarkmindRich(frontmatter)) {
					// 读取、修改 笔记
					this.app.vault.process(currentMdFile, content => {
						marked.lexer(content).forEach((token) => {
							// 解析markdown中的json代码块
							if (token.type === 'code' && token.lang === 'json') {
								let jsonCodeBlock = token.text
								// 解析json
								let json = JSON.parse(jsonCodeBlock)

								json['mindData'].forEach((mindData: any[]) => {
									mindData.forEach(node => {
										debugger
										// 1. 处理wiki链接
										node['text'] = this.wikiLinkProcessor(node['text'], renameData)

										// 2. 处理markdown链接
										node['text'] = this.markdownLinkProcessor(node['text'], renameData)

										// 3. markmind的节点链接
										node['text'] = this.markmindLinkProcessor(node['text'], renameData)
									})
								})

								if (renameData.isUpdate) {
									// 新的json代码块
									let newJsonCodeBlock = JSON.stringify(json)
									// 替换原来的json代码块
									content = content.replace(jsonCodeBlock, newJsonCodeBlock)
									new Notice(`${currentMdFile.path}中的链接已更新！`)
								}
							}
						})

						// 初始化的导图，没有json代码块
						return content
					}).catch((error) => {
						debugLog("error:", error)
					})
				}
			}).catch((error) => {
				debugLog("error:", error)
			})
		})

	}

	/** 处理wiki链接 */
	private wikiLinkProcessor(content: string, renameData: {
		newFile: Metadata;
		oldFile: Metadata;
		isUpdate: boolean
	}): string {
		let originContent = content

		// wiki链接：[[文件名]]、[[路径/文件名]]、[[路径/文件名#^123]]
		const wikiLinkRegex = /!?\[\[((?!\[\[).*)]]/g;
		let match;

		while ((match = wikiLinkRegex.exec(content)) !== null) {
			let wikiLinkAll = match[0]
			let wikiLink = match[1]
			// 去掉空格
			wikiLinkAll.replace(wikiLink, wikiLink.trim())
			wikiLink = wikiLink.trim()

			// 1. 判断链接中，是否有 # ^ | --> [[路径/文件名#^123]]
			let separatorList = ["#", "^", "|"]

			let remainAddress
			if (/#|\^|\|/g.test(wikiLink)) {
				debugLog("处理 # ^ |")
				for (let separator of separatorList) {
					let addressList = wikiLink.split(separator)
					if (addressList.length > 1) {
						let tittleAddress = addressList[0].trim()
						// 将 当前wiki链接 替换为 标题wiki链接
						wikiLink = tittleAddress // 路径/文件名

						addressList.shift()

						remainAddress = addressList.join().trim()

						remainAddress = separator + remainAddress // #^123
					}
				}
			}

			// 2. 判断是否有扩展名
			let suffixAndDot = wikiLink.substring(wikiLink.lastIndexOf("."));//.txt // xxxxxtxt
			let suffix = wikiLink.substring(wikiLink.lastIndexOf(".") + 1);// txt // xxxxxtxt
			let hasExtension = false
			// 排除这种文件名：123.今天吃什么
			if (suffixAndDot.startsWith('.') && !/[\u4E00-\u9FA5]+|^\s+/.test(suffix)) {

				hasExtension = true
				wikiLink = this.removeExtension(wikiLink)
			}

			// 3. 判断是否有路径"/" [[路径/文件名]]
			if (wikiLink.includes('/')) {
				if (this.removeExtension(renameData.oldFile.path) == wikiLink) {
					wikiLink = this.removeExtension(renameData.newFile.parentPath)
				}
			} else {
				// [[文件名]]
				if (renameData.oldFile.basename == wikiLink) {
					wikiLink = renameData.newFile.basename
				}
			}

			// 4. 后处理
			if (hasExtension) {
				wikiLink = wikiLink + suffixAndDot
			}
			// 4.2加上路径中的 # ^ | --> [[路径/文件名#^123]]
			if (remainAddress != null) {
				wikiLink = wikiLink + remainAddress
			}

			// 修改原来的wiki链接
			wikiLinkAll = wikiLinkAll.replace(match[1], wikiLink)
			// 替换content中的wiki链接
			content = content.replace(match[0], wikiLinkAll)
		}
		if (originContent != content) {
			renameData.isUpdate = true
			debugLog("处理前:", originContent)
			debugLog("处理后:", content)
		}

		// 没有匹配到正则，直接返回
		return content
	}

	/** 处理markdown链接 */
	private markdownLinkProcessor(content: string, renameData: {
		newFile: Metadata;
		oldFile: Metadata;
		isUpdate: boolean
	}): string {
		// markdown链接：[名称](地址)
		const mdLinkRegex = /!?\[.*?]\((.*?)\)/g;
		let match;
		while ((match = mdLinkRegex.exec(content)) !== null) {
			let mdLinkAll = match[0]
			let mdLink = match[1]

			if (mdLink.includes(renameData.oldFile.path)) {
				let newLink = mdLinkAll.replace(mdLink, renameData.newFile.path)
				content = content.replace(mdLinkAll, newLink)
				renameData.isUpdate = true;
			}
		}
		// 没有匹配到正则，直接返回
		return content
	}

	private markmindLinkProcessor(content: string, renameData: {
		newFile: Metadata;
		oldFile: Metadata;
		isUpdate: boolean
	}): string {
		const markmindNodeLinkRegex = /jump-to-pdf\?md=(.*\.md)&node=.*/g
		let match
		while ((match = markmindNodeLinkRegex.exec(content)) !== null) {
			let markmindNodeLinkAll = match[0]
			let markmindNodeLink = match[1]

			// 将 路径 + 文件名，进行url编码
			if (markmindNodeLink.includes(encodeURIComponent(renameData.oldFile.path))) {
				let newLink = markmindNodeLinkAll.replace(markmindNodeLink, encodeURIComponent(renameData.newFile.path))
				content = content.replace(markmindNodeLinkAll, newLink)
			}
		}
		// 没有匹配到正则，直接返回
		return content
	}

	private isMarkmindRich(frontmatter: any) {
		return JSON.stringify(frontmatter) != '{}' && frontmatter['mindmap-plugin'] == 'rich';
	}

	private removeExtension(filename: string) {
		return filename.substring(0, filename.lastIndexOf('.')) || filename;
	}
}
