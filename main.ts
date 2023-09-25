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

	private renameEventProcessor(newFile: TAbstractFile | TFile, oldPath: string) {
		debugLog("new file:", newFile);
		debugLog("old file:", getMetadata(oldPath));
		let oldFile = getMetadata(oldPath)

		if (newFile instanceof TFile) {
			if (
				path.basename(oldPath, path.extname(oldPath)) ===
				path.basename(newFile.path, path.extname(newFile.path))
			) {
				// 拖拽文件
				debugLog("拖拽文件、重命名文件夹中的文件")
				this.updateMarkmindLinkByRenameEvent(oldFile, newFile);
			} else {
				// 重命名文件事件
				debugLog("单重命名文件")
				this.updateMarkmindLinkByRenameEvent(oldFile, newFile);
			}
		} else if (newFile instanceof TFolder) {
			// 重命名文件夹事件
			// 会触发 rename事件，此处可以不处理
		}
	}

	/** 更新markmind中的链接 */
	private updateMarkmindLinkByRenameEvent(oldFile: Metadata, newFile: TFile) {
		let markdownFiles = this.app.vault.getMarkdownFiles();
		markdownFiles.forEach((mdFile) => {
			// 更新markmind中的链接
			this.app.fileManager.processFrontMatter(mdFile, frontmatter => {
				// 更新markmind中的链接
				// 找到markmind文件
				if (this.isMarkmindRich(frontmatter)) {
					this.app.vault
						.process(mdFile, content => {
							debugLog(`当前markmind文件：${mdFile.name}`)
							debugLog(`当前markmind文件内容：${content}`)

							marked.lexer(content).forEach((token) => {
								// 解析markdown中的json代码块
								if (token.type === 'code' && token.lang === 'json') {
									debugLog(`当前json：${token.text}`)
									let jsonCodeBlock = token.text
									// 解析json
									let json = JSON.parse(jsonCodeBlock)
									debugLog("miniData数据：", json['mindData'])

									let isUpdate = false;

									json['mindData'].forEach((mindData: any[]) => {
										mindData.forEach(node => {
											let text = node['text']

											let match;

											// wiki链接：[[文件名（不带后缀）]]、[[路径/文件名（不带后缀）]]
											// const wikiLinkRegex = /!?\[\[(.*?)]]/g;
											const wikiLinkRegex = /!?\[\[((?!\[\[).*)]]/g;
											while ((match = wikiLinkRegex.exec(text)) !== null) {
												let wikiLink = match[0]
												let address = match[1]

												// 判断是否，当前的重命名文件的旧链接
												if (address.includes(oldFile.basename)) {
													debugLog(`
                                                    节点更新前的内容：${node['text']}
                                                    匹配到 wiki 链接:${wikiLink}
                                                    链接中的地址数据:${address}
                                                    `)


													let separatorList = ["#", "^", "|"]
													let regex = new RegExp(separatorList.join("|"))
													debugLog(regex)

													if (regex.test(address)) {
														debugLog("有 # ^ |")
														for (let separator of separatorList) {
															let addressList = address.split(separator)
															if (addressList.length > 1) {
																debugLog(`当前分隔符是：${separator}`)
																let tittleAddress = addressList[0]
																debugLog(`标题是：${tittleAddress}`)

																addressList.shift()

																let remainAddress = addressList.join()
																debugLog(`剩下的内容是：${remainAddress}`)

																remainAddress = separator + remainAddress
																debugLog(`重新加入分隔符：${remainAddress}`)

																// [[路径/文件名（不带后缀）]]
																if (tittleAddress.includes('/')) {
																	let newLink

																	// 判断是否有扩展名
																	let suffixAndDot = tittleAddress.substring(tittleAddress.lastIndexOf("."));//.txt // xxxxxtxt
																	let suffix = tittleAddress.substring(tittleAddress.lastIndexOf(".") + 1);//txt // xxxxxtxt
																	// 排除这种文件名：123.今天吃什么
																	if (suffixAndDot.startsWith('.') && !/[\u4E00-\u9FA5]+|^\s+/.test(suffix)) {
																		console.log("有后缀")
																		// [[路径/文件名（带后缀）]]
																		newLink = wikiLink.replace(tittleAddress, newFile.path)
																	} else {
																		// [[路径/文件名（不带后缀）]]
																		newLink = wikiLink.replace(tittleAddress, this.removeExtension(newFile.path))
																	}
																	node['text'] = node['text'].replace(wikiLink, newLink + remainAddress)
																	isUpdate = true;

																	debugLog(`
																	重命名wiki链接 - 文件夹/文件:
																		旧链接：${wikiLink}
																		新链接：${newLink}
																	`);

																	// [[文件名]]
																} else {
																	let newLink

																	// 判断是否有扩展名
																	let suffixAndDot = tittleAddress.substring(tittleAddress.lastIndexOf("."));//.txt // xxxxxtxt
																	let suffix = tittleAddress.substring(tittleAddress.lastIndexOf(".") + 1);//txt // xxxxxtxt
																	// 排除这种文件名：123.今天吃什么
																	if (suffixAndDot.startsWith('.') && !/[\u4E00-\u9FA5]+|^\s+/.test(suffix)) {
																		// [[文件名（带后缀）]]
																		debugLog("有后缀")
																		newLink = wikiLink.replace(tittleAddress, newFile.name)
																	} else {
																		// [[文件名（不带后缀）]]
																		newLink = wikiLink.replace(tittleAddress, newFile.basename)
																	}

																	node['text'] = node['text'].replace(wikiLink, newLink + remainAddress)
																	isUpdate = true;
																	debugLog(`
																	重命名wiki链接 - 文件:
																		旧链接：${wikiLink}
																		新链接：${newLink}
																	`);
																}

																// 中断循环
																break
															}
														}
													} else {
														// [[路径/文件名（不带后缀）]]
														if (address.includes('/')) {
															let newLink

															// 判断是否有扩展名
															let suffixAndDot = address.substring(address.lastIndexOf("."));//.txt // xxxxxtxt
															let suffix = address.substring(address.lastIndexOf(".") + 1);//txt // xxxxxtxt
															// 排除这种文件名：123.今天吃什么
															if (suffixAndDot.startsWith('.') && !/[\u4E00-\u9FA5]+|^\s+/.test(suffix)) {
																console.log("有后缀")
																// [[路径/文件名（带后缀）]]
																newLink = wikiLink.replace(address, newFile.path)
															} else {
																// [[路径/文件名（不带后缀）]]
																newLink = wikiLink.replace(address, this.removeExtension(newFile.path))
															}
															node['text'] = node['text'].replace(wikiLink, newLink)
															isUpdate = true;

															debugLog(`
                                                        重命名wiki链接 - 文件夹/文件:
                                                            旧链接：${wikiLink}
                                                            新链接：${newLink}
                                                        `);

															// [[文件名]]
														} else {
															let newLink

															// 判断是否有扩展名
															let suffixAndDot = address.substring(address.lastIndexOf("."));//.txt // xxxxxtxt
															let suffix = address.substring(address.lastIndexOf(".") + 1);//txt // xxxxxtxt
															// 排除这种文件名：123.今天吃什么
															if (suffixAndDot.startsWith('.') && !/[\u4E00-\u9FA5]+|^\s+/.test(suffix)) {
																// [[文件名（带后缀）]]
																debugLog("有后缀")
																newLink = wikiLink.replace(address, newFile.name)
															} else {
																// [[文件名（不带后缀）]]
																newLink = wikiLink.replace(address, newFile.basename)
															}

															node['text'] = node['text'].replace(wikiLink, newLink)
															isUpdate = true;
															debugLog(`
                                                        重命名wiki链接 - 文件:
                                                            旧链接：${wikiLink}
                                                            新链接：${newLink}
                                                        `);
														}
													}
													debugLog("节点更新后的内容：", node['text']);
												}
											}

											// markdown链接：[名称](地址)
											const mdLinkRegex = /!?\[.*?]\((.*?)\)/g;
											while ((match = mdLinkRegex.exec(text)) !== null) {
												let mdLink = match[0]
												let address = match[1]

												if (address.includes(oldFile.path)) {
													debugLog("节点更新前的内容：", node['text']);
													debugLog("匹配到 mdLink 链接:", mdLink);
													debugLog("链接中的地址数据:", address);

													let newLink = mdLink.replace(address, newFile.path)
													node['text'] = node['text'].replace(mdLink, newLink)
													isUpdate = true;

													debugLog("重命名markdown链接:");
													debugLog("旧链接：", mdLink);
													debugLog("新链接：", newLink);
													debugLog("节点更新后的内容：", node['text']);
												}
											}

											// markmind的节点链接
											const markmindNodeLinkRegex = /jump-to-pdf\?md=(.*)\.md&node=.*/g;
											while ((match = markmindNodeLinkRegex.exec(text)) !== null) {
												let markmindNodeLink = match[0]
												let address = match[1]

												// 将 路径 + 文件名，进行url编码
												if ((address + ".md").includes(encodeURIComponent(oldFile.path))) {
													debugLog("节点更新前的内容：", node['text']);
													debugLog("匹配到 markmind节点 链接:", markmindNodeLink);
													debugLog("链接中的地址数据:", address);

													let newLink = markmindNodeLink.replace(address, encodeURIComponent(this.removeExtension(newFile.path)))
													node['text'] = node['text'].replace(markmindNodeLink, newLink)
													isUpdate = true;
													debugLog(`
                                                    重命名 markmind节点 链接:
                                                        旧链接：${markmindNodeLink}
                                                        新链接：${newLink}
                                                        节点更新后的内容：${node['text']}
                                                    `)
												}
											}
										})
									})

									if (isUpdate) {
										// 新的json代码块
										let newJsonCodeBlock = JSON.stringify(json)
										// 替换原来的json代码块
										content = content.replace(jsonCodeBlock, newJsonCodeBlock)
										new Notice(`${mdFile.basename}中的链接已更新！`)
									}
								}
							})

							// 初始化的导图，没有json代码块
							return content
						})
				}
			}).then()
				.catch((error) => {
					debugLog("error:", error)
				})
		})

		// 当前重命名的是markmind文件，且是rich模式
		// markmind改名，更新markdown中的 markmind节点链接
		this.app.fileManager.processFrontMatter(newFile, frontmatter => {
			// 当前重命名的是markmind文件，且是rich模式
			// markmind改名，更新markdown中的 markmind节点链接
			if (this.isMarkmindRich(frontmatter)) {
				markdownFiles.forEach((mdFile) => {
					const markmindNodeLinkRegex = /jump-to-pdf\?md=(.*)\.md&node=.*/g;
					this.app.vault
						.process(mdFile, content => {
							let match
							while ((match = markmindNodeLinkRegex.exec(content)) !== null) {
								let markmindNodeLink = match[0]
								let address = match[1]

								// 将 路径 + 文件名（去掉扩展名），进行url编码
								if (address.includes(encodeURIComponent(this.removeExtension(oldFile.path)))) {
									debugLog("节点更新前的内容：", content);
									debugLog("匹配到 markmind节点 链接:", markmindNodeLink);
									debugLog("链接中的地址数据:", address);

									let newLink = markmindNodeLink.replace(address, encodeURIComponent(this.removeExtension(newFile.path)))
									content = content.replace(markmindNodeLink, newLink)
									debugLog(`
                                                    重命名 markmind节点 链接:
                                                        旧链接：${markmindNodeLink}
                                                        新链接：${newLink}
                                                        节点更新后的内容：${content}
                                                    `)
									new Notice(`${mdFile.basename}中的链接已更新！`)
								}
							}
							// 没有数据，直接返回
							return content
						})
				})
			}
		}).catch((error) => {
			debugLog("error:", error)
		})
	}

	private isMarkmindRich(frontmatter: any) {
		return JSON.stringify(frontmatter) != '{}' && frontmatter['mindmap-plugin'] == 'rich';
	}

	private removeExtension(filename: string) {
		return filename.substring(0, filename.lastIndexOf('.')) || filename;
	}
}
