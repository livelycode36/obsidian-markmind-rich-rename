import {Plugin, TAbstractFile} from 'obsidian';
import {debugLog} from "./src/log";

export default class MarkmindRenamePlugin extends Plugin {

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			// 在重命名文件夹时触发重命名事件，重命名文件夹中的每个文件/文件夹（包括其本身）都将触发该事件
			this.app.vault.on("rename", async (file: TAbstractFile, oldPath: string) => {
				debugLog("on rename event - new path and old path:", file.path, oldPath);

				// 将对象格式化为json字符串
				debugLog("on rename event - file:",file);


				// if (!this.settings.autoRenameAttachment) {
				//     debugLog("rename - auto rename not enabled:", this.settings.autoRenameAttachment);
				//     return;
				// }
				//
				// const type = ATTACHMENT_RENAME_TYPE.BOTH;
				// debugLog("rename - attachRenameType:", type);
				// // if (type === ATTACHMENT_RENAME_TYPE.NULL) {
				// //     debugLog("rename - no variable use, skipped");
				// //     return;
				// // }
				//
				// if (file instanceof TFile) {
				//     if (file.parent && isExcluded(file.parent.path, this.settings)) {
				//         debugLog("rename - exclude path:", file.parent.path);
				//         new Notice(`${file.path} was excluded, skipped`);
				//         return;
				//     }
				//     // 如果重命名的文件是附件，则跳过
				//     if (isAttachment(this.settings, file)) {
				//         debugLog("rename - not processing rename on attachment:", file.path);
				//         return;
				//     }
				//
				//     let eventType: RenameEventType;
				//     if (
				//         path.basename(oldPath, path.extname(oldPath)) ===
				//         path.basename(file.path, path.extname(file.path))
				//     ) {
				//         // 重命名文件夹事件
				//         eventType = RENAME_EVENT_TYPE_FOLDER;
				//         debugLog("rename - RENAME_EVENT_TYPE:", RENAME_EVENT_TYPE_FOLDER);
				//     } else {
				//         // 重命名文件事件
				//         eventType = RENAME_EVENT_TYPE_FILE;
				//         debugLog("rename - RENAME_EVENT_TYPE:", RENAME_EVENT_TYPE_FILE);
				//     }
				//
				//     // debugLog("rename - overrideSetting:", setting);
				//     const processor = new RenameHandler(this.app, this.settings, setting);
				//     await processor.onRename(file, oldPath, eventType, type);
				// } else if (file instanceof TFolder) {
				//     // 忽略文件夹的重命名事件
				//     // debugLog("rename - ignore rename folder event:", file.name, oldPath);
				//     return;
				// }
			}),
		);
	}

	onunload() {

	}

	async loadSettings() {
	}

	async saveSettings() {
		// await this.saveData(this.settings);
	}
}
