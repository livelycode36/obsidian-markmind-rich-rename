import { TFile } from "obsidian";
import { path } from "src/path";


/**
 * 文件的元数据
 */
export class Metadata {
    /** 文件路径 */
    path: string;

    /** 文件名（带扩展名） */
    name: string;

    /** 文件的基名（不含扩展名） */
    basename: string;

    /** 文件扩展名 */
    extension: string;

    /** 文件的父路径 */
    parentPath = "";

    /** 文件的父路径基名 */
    parentName = "";

    attachmentFile?: TFile;

    constructor(
        path: string,
        name: string,
        basename: string,
        extension: string,
        parentPath: string,
        parentName: string,
        attachmentFile?: TFile,
    ) {
        this.path = path;
        this.name = name;
        this.basename = basename;
        this.extension = extension;
        this.parentPath = parentPath;
        this.parentName = parentName;
        this.attachmentFile = attachmentFile;
    }

}

/**
 * 为给定的文件路径返回一个新的 Metadata 实例。
 *
 * @param {string} file - The full path to the file.
 * @return {Metadata} A new instance of Metadata containing information about the file.
 */
export function getMetadata(file: string, attach?: TFile): Metadata {
    const parentPath = path.dirname(file);
    const parentName = path.basename(parentPath);
    const name = path.basename(file);
    const extension = path.extname(file);
    const basename = path.basename(file, extension);

    return new Metadata(file, name, basename, extension, parentPath, parentName, attach);
}
