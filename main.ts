import {Notice, Plugin, TAbstractFile, TFile, TFolder} from 'obsidian';
import {debugLog} from "./src/log";
import {path} from "./src/path";
import {getMetadata} from 'src/metadata';

export default class MarkmindRenamePlugin extends Plugin {
    async onload() {
        this.registerEvent(
            // 在重命名文件夹时触发重命名事件，重命名文件夹中的每个文件/文件夹（包括其本身）都将触发该事件
            this.app.vault.on("rename", async (file: TAbstractFile, oldPath: string) => {
                this.renameEventProcessor(file, oldPath);
            })
        );
    }

    private renameEventProcessor(newFile: TAbstractFile | TFile, oldPath: string) {
        // debugLog("on rename event - new path and old path:", file.path, oldPath);
        // debugLog("new file:", file);
        // debugLog("new file:", getMetadata(file.path));

        if (newFile instanceof TFile) {
            if (
                path.basename(oldPath, path.extname(oldPath)) ===
                path.basename(newFile.path, path.extname(newFile.path))
            ) {
                debugLog("拖拽文件")

                let markdownFiles = this.app.vault.getMarkdownFiles();
                markdownFiles.forEach((mdFile) => {
                    this.app.fileManager.processFrontMatter(mdFile, frontmatter => {
                        // 找到markmind文件
                        if (this.isMarkmindRich(frontmatter)) {
                            this.app.vault.read(mdFile)
                                .then((content) => {
                                    debugLog(`当前文件：${mdFile.name}`)
                                    // debugLog("内容：")
                                    // debugLog(content)
                                    // debugLog("内容结束")

                                    let match;

                                    // wiki链接：[[文件名（不带后缀）]]、[[路径/文件名（不带后缀）]]
                                    const wikiLinkRegex = /!?\[\[(.*?)]]/g;
                                    // const wikiLinkRegex = /!?\[\[((?!\[\[).*)]]/g;
                                    while ((match = wikiLinkRegex.exec(content)) !== null) {
                                        // debugLog("当前匹配的全内容:", match[0]);
                                        // debugLog("链接中的地址数据:", match[1]);

                                        let linkOldPath = match[1]
                                        let oldPathMetadata = getMetadata(oldPath);

                                        // 判断是否，当前的重命名文件的旧链接
                                        // debugger
                                        if (linkOldPath.includes(oldPathMetadata.basename)) {
                                            // 判断是 路径/文件名 还是 文件名
                                            if (linkOldPath.includes('/')) {
                                                debugLog("重命名wiki链接 - 文件夹/文件:");
                                                debugLog("旧链接：", linkOldPath);
                                                debugLog("新链接：", this.removeExtension(newFile.path));
                                                content = content.replace(linkOldPath, this.removeExtension(newFile.path))
                                            } else {
                                                debugLog("重命名wiki链接 - 文件:");
                                                debugLog("旧链接：", linkOldPath);
                                                debugLog("新链接：", newFile.basename);
                                                content = content.replace(linkOldPath, newFile.basename)
                                            }
                                        }
                                    }

                                    // markdown链接：[名称](地址)
                                    const mdLinkRegex = /!?\[.*?]\((.*?)\)/g;
                                    while ((match = wikiLinkRegex.exec(content)) !== null) {
                                        // debugLog("当前匹配的全内容:", match[0]);
                                        // debugLog("链接中的地址数据:", match[1]);

                                        let linkOldPath = match[1]
                                        if (linkOldPath.includes(oldPath)) {
                                            let oldLink = match[0]
                                            let newLink = match[0].replace(match[1], newFile.path)
                                            content = content.replace(linkOldPath, newFile.path)

                                            debugLog("重命名markdown链接:");
                                            debugLog("旧链接：", oldLink);
                                            debugLog("新链接：", newLink);
                                            debugLog("更新后的内容：",content);
                                        }
                                    }

                                    // markmind的节点链接
                                    const markmindNodeLinkRegex = /obsidian:\/\/jump-to-pdf\?md=(.*)\.md&node=.*\)/g;
                                    while ((match = markmindNodeLinkRegex.exec(content)) !== null) {

                                        let linkOldPath = match[1]
                                        // 将 路径 + 文件名（去掉扩展名），进行url编码
                                        if (linkOldPath.includes(encodeURIComponent(this.removeExtension(oldPath)))) {
                                            let oldLink = match[0]
                                            let newLink = match[0].replace(match[1], encodeURIComponent(this.removeExtension(newFile.path)))

                                            content = content.replace(oldLink, newLink)
                                            // debugLog("重命名markdown链接:");
                                            // debugLog("旧链接：",oldLink);
                                            // debugLog("新链接：",newLink);
                                            // debugLog("更新后的内容：",content);

                                            this.app.vault.modify(newFile, content)
                                            new Notice(`该文件 ${newFile.basename} 中的 markmind的节点链接 已更新！`);
                                        }
                                    }
                                })
                        }
                    })
                })
            } else {
                // 重命名文件事件
                debugLog("重命名文件")
            }
        } else if (newFile instanceof TFolder) {
            // 重命名文件夹事件
            debugLog("重命名文件夹")
            return;
        }
    }

    private isMarkmindRich(frontmatter: any) {
        return JSON.stringify(frontmatter) != '{}' && frontmatter['mindmap-plugin'] == 'rich';
    }

    private removeExtension(filename: string) {
        return filename.substring(0, filename.lastIndexOf('.')) || filename;
    }

    onunload() {

    }

    async loadSettings() {
    }

    async saveSettings() {
        // await this.saveData(this.settings);
    }
}
