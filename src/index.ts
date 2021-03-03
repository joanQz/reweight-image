import { EMPTY, Observable } from 'rxjs';
import { expand, map, mergeMap } from 'rxjs/operators';
import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported
// https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
// Richie Bendall's solution
import { Convert } from './convert';

type Base64image = string;

export { Convert };

export interface ReweightLimits {
  fileSizeMb?: number,
  imageSize?: number,
  jpegQuality?: number
}

export interface ReweightOptions {
  coverMaxImageSize?: boolean,
  imageSizeRatio?: number,
  jpegQualityRatio?: number
}

export class Reweight {
  // TODO: add functionality to reduce image size and jpeg quality
  compressImageFile(fileImage: File, limits: ReweightLimits, options: ReweightOptions) {

    if (limits.fileSizeMb && !options.imageSizeRatio)
      options.imageSizeRatio = 0.99;
    if (limits.fileSizeMb && !options.jpegQualityRatio)
      options.jpegQualityRatio = 0.99;
    let imageSizeRatio = options.imageSizeRatio || 0.99,
        jpegQualityRatio = options.jpegQualityRatio? options.jpegQualityRatio: 0.99;
    // TODO: refactor all these variables default values, by reviewing its actual meaning
    const fullLimits = this.getCompleteInputLimits(limits);
    let imageSize: number = <number>fullLimits.imageSize,
        jpegQuality: number = <number>fullLimits.jpegQuality;
        // Them can be safely cast thanks to getCompleteInputLimits
    let convert = new Convert();
    return convert.getBase64FromBlob(fileImage).pipe(
      mergeMap((base64image: Base64image)=>{
          return this.compressBase64Image(base64image, imageSize, jpegQuality);
      }),
      expand((base64image: Base64image)=>{
        let blob = convert.getBlobFromBase64(base64image);
        if (blob.size > <number>fullLimits.fileSizeMb) {
          // Cast can be safely done thanks to getCompleteInputLimits
          imageSize *= imageSizeRatio;
          jpegQuality *= jpegQualityRatio;
          return this.compressBase64Image(base64image, imageSize, jpegQuality);
        } else
          return EMPTY;
      }),
      map((base64image: any) => {
        // seemingly there's a bug in rxjs (to confirm): declaring ret as Base64image (string)
        // throws a lint and compiling error. Workaround is declaring as any and casting it in the
        // next line
        let blob = convert.getBlobFromBase64(<Base64image>base64image);
        return new File([blob], fileImage.name, {type: 'image/jpeg'});
      })
    );
  }

  private getCompleteInputLimits(limits: ReweightLimits): ReweightLimits {
    limits.fileSizeMb = limits.fileSizeMb?? Infinity;
    limits.imageSize = limits.imageSize?? Infinity;
    limits.jpegQuality = 1;
    return limits;
  }

  private compressBase64Image(
                                base64Image: string,
                                imageSize: number,
                                jpegQuality: number
                              ): Observable<Base64image> {
    return new Observable(observer=>{
      let imageElement: HTMLImageElement = document.createElement('img');
      imageElement.onload = () => {
        let compressedBase64Image: Base64image = this.compressImageElement(imageElement, imageSize, jpegQuality);
        observer.next(compressedBase64Image);
      }
      imageElement.src = base64Image;
    });
  }

  private compressImageElement(
                              imageElement: HTMLImageElement,
                              imageSize: number,
                              jpegQuality: number
                            ): Base64image {
    const {width: imgWidth, height: imgHeight} = imageElement,
          scale = this.getScale(imageSize, imgWidth, imgHeight, false),
          canvas = this.createCanvasWithFinalDimensions(scale * imgWidth, scale * imgHeight);
    this.fillCanvasWithImage(canvas, scale, imageElement);
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }

  private createCanvasWithFinalDimensions(width: number, height: number): HTMLCanvasElement {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    return canvas;
  }

  private fillCanvasWithImage(canvas: HTMLCanvasElement, scale: number, imageElement: HTMLImageElement) {
    let context: CanvasRenderingContext2D = <CanvasRenderingContext2D>(canvas.getContext('2d'));
    // type can be safely cast to CanvasRenderingContext2D as '2d' is a supported identifier
    context.scale(scale, scale);
    context.drawImage(imageElement, 0, 0);
  }

  private  getScale(imageSize: number, imgWidth: number, imgHeight: number, cover: boolean) {
    const referenceDimension =  cover
                              ? Math.min(imgWidth, imgHeight)
                              : Math.max(imgWidth, imgHeight);
    const scale = imageSize / referenceDimension;
    if (scale > 1)
      return 1;

    return scale;
  }

}
