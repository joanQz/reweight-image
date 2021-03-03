import { EMPTY, Observable, of } from 'rxjs';
import { expand, map, mergeMap } from 'rxjs/operators';
import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported
// https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
// Richie Bendall's solution
import { Convert } from './convert';

type Base64data = string;
type Base64image = {base64data: Base64data, width: number, height: number};

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
  readonly BYTES_IN_ONEMB = 1000000;
  readonly DEFAULT_REDUCE_RATIO = 0.99;
  readonly CONVERT = new Convert();

  // TODO: add functionality to reduce image size and jpeg quality
  compressImageFile(fileImage: File, limits: ReweightLimits, options: ReweightOptions) {
    const fullOptions = this.getCompleteInputOptions(options),
          fullLimits = this.getCompleteInputLimits(limits);
    let fileSizeMb: number = <number>fullLimits.fileSizeMb * this.BYTES_IN_ONEMB,
        imageSize: number = <number>fullLimits.imageSize,
        jpegQuality: number = <number>fullLimits.jpegQuality;
        // Them can be safely cast thanks to getCompleteInputLimits
    return this.CONVERT.getBase64FromBlob(fileImage).pipe(
      mergeMap((base64data: Base64data)=>{
          return this.compressBase64Image(base64data, imageSize, jpegQuality);
      }),
      mergeMap((base64image: Base64image) => {
        return this.reweightBase64Image(base64image, fileSizeMb, imageSize, jpegQuality, fullOptions);
      }),
      map((base64image: Base64image) => {
        let blob = this.CONVERT.getBlobFromBase64(base64image.base64data);
        return new File([blob], fileImage.name, {type: 'image/jpeg'});
      })
    );
  }

  private reweightBase64Image(base64image: Base64image, fileSizeMb: number, imageSize: number, jpegQuality: number, fullOptions: ReweightOptions) {
    return of(base64image).pipe(
      expand((base64image: Base64image)=>{
        let blob = this.CONVERT.getBlobFromBase64(base64image.base64data);
        if (imageSize == Infinity)
          imageSize = Math.max(base64image.width, base64image.height);
        if (blob.size > fileSizeMb) {
          imageSize *= <number>fullOptions.imageSizeRatio;
          jpegQuality *= <number>fullOptions.jpegQualityRatio;
          // Casts can be safely done thanks to getCompleteInputLimits
          return this.compressBase64Image(base64image.base64data, imageSize, jpegQuality);
        } else
          return EMPTY;
      })
    );
  }

  private getCompleteInputLimits(limits: ReweightLimits): ReweightLimits {
    limits.fileSizeMb = limits.fileSizeMb?? Infinity;
    limits.imageSize = limits.imageSize?? Infinity;
    limits.jpegQuality = 1;
    return limits;
  }

  private getCompleteInputOptions(options: ReweightOptions) {
    options.imageSizeRatio = options.imageSizeRatio?? this.DEFAULT_REDUCE_RATIO;
    options.jpegQualityRatio = options.jpegQualityRatio?? this.DEFAULT_REDUCE_RATIO;
    options.coverMaxImageSize = options.coverMaxImageSize?? false;  // Not really needed. Added only
                                                                    // for code readability
    return options;
  }

  private compressBase64Image(
                                base64data: Base64data,
                                imageSize: number,
                                jpegQuality: number
                              ): Observable<Base64image> {
    return new Observable(observer=>{
      let imageElement: HTMLImageElement = document.createElement('img');
      imageElement.onload = () => {
        let compressedBase64Image: Base64image =
              this.compressImageElement(imageElement, imageSize, jpegQuality);
        observer.next(compressedBase64Image);
      }
      imageElement.src = base64data;
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
    return {base64data: canvas.toDataURL('image/jpeg', jpegQuality), width: imgWidth, height: imgHeight};
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
