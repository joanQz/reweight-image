import { Observable } from 'rxjs';

export class Reweight {

  static compressImage(image: File, limits: {
        maxImageSize?: number,
        jpegQuality?: number,
        maxFileSizeMb?: number,
        imageSizeRatio?: number,
        jpegQualityRatio?: number
  }): Observable<File> {
    let obs = new Observable<File>();

    return obs;
  }

  static getUrlFromBlob(file: File): string {
    return '';
  }
}
