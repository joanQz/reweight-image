import { EMPTY, Observable, Observer, of } from 'rxjs';
import { expand, map, mergeMap } from 'rxjs/operators';
import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported
// https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
// Richie Bendall's solution
import { Convert } from './convert';

type Base64data = string;
type Base64image = {base64data: Base64data, width: number, height: number};

export { Convert };

export interface ReweightImageLimits {
  fileSizeMb?: number,
  imageSizePx?: number,
  jpegQuality?: number
}

export interface ReweightImageOptions {
  coverMaxImageSize?: boolean,
  imageSizeRatio?: number,
  jpegQualityRatio?: number
}

export class ReweightImage {
  readonly BYTES_IN_ONEMB = 1000000;
  readonly DEFAULT_REDUCE_RATIO = 0.99;
  readonly CONVERT = new Convert();

  limits: {
    fileSizeMb: number,
    imageSizePx: number,
    jpegQuality: number
  };// not exactly as ReweightImageLimits, as here nothing is optional

  options: {
    coverMaxImageSize: boolean,
    imageSizeRatio: number,
    jpegQualityRatio: number
  };// not exactly as ReweightImageOptions, as here nothing is optional

  constructor(limits: ReweightImageLimits, options?: ReweightImageOptions) {
    const fullOptions = this.getCompleteInputOptions(options),
          fullLimits = this.getCompleteInputLimits(limits);
    this.limits = {
      fileSizeMb: <number>fullLimits.fileSizeMb * this.BYTES_IN_ONEMB,
      imageSizePx: <number>fullLimits.imageSizePx,
      jpegQuality: <number>fullLimits.jpegQuality
    };
    this.options = {
      coverMaxImageSize: <boolean>fullOptions.coverMaxImageSize,
      imageSizeRatio:  <number>fullOptions.imageSizeRatio,
      jpegQualityRatio:  <number>fullOptions.jpegQualityRatio
    }
  }

  compressImageFile(fileImage: File) {
    return this.CONVERT.getBase64FromBlob(fileImage).pipe(
      mergeMap((base64data: Base64data)=>{
          return this.compressBase64Image(base64data, this.limits.imageSizePx, this.limits.jpegQuality);
      }),
      mergeMap((base64image: Base64image) => {
        return this.reweightBase64Image(base64image);
      }),
      map((base64image: Base64image) => {
        let blob = this.CONVERT.getBlobFromBase64(base64image.base64data);
        return new File([blob], fileImage.name, {type: 'image/jpeg'});
      })
    );
  }

  // Recursively calls compressBase64Image until file size is under limits.fileSizeMb
  private reweightBase64Image(base64image: Base64image): Observable<Base64image> {
    let imageSize = this.limits.imageSizePx,
        jpegQuality = this.limits.jpegQuality;
    return new Observable((observer: Observer<Base64image>)=>{
      of(base64image).pipe(
        expand((base64image: Base64image)=>{
          let blob = this.CONVERT.getBlobFromBase64(base64image.base64data);
          if (imageSize == Infinity)
            imageSize = Math.max(base64image.width, base64image.height);
          if (blob.size > this.limits.fileSizeMb) {
            imageSize *= <number>this.options.imageSizeRatio;
            jpegQuality *= <number>this.options.jpegQualityRatio;
            // Casts can be safely done thanks to getCompleteInputLimits
            return this.compressBase64Image(base64image.base64data, imageSize, jpegQuality);
          } else
            return EMPTY;
        })
      ).subscribe({
        next: (base64image: Base64image)=>{
          let blob = this.CONVERT.getBlobFromBase64(base64image.base64data);
          if (blob.size < this.limits.fileSizeMb)
            observer.next(base64image);
        }
      });
    });
  }

  private getCompleteInputLimits(limits?: ReweightImageLimits): ReweightImageLimits {
    if (!limits) limits = {};
    limits.fileSizeMb = limits.fileSizeMb?? Infinity;
    limits.imageSizePx = limits.imageSizePx?? Infinity;
    limits.jpegQuality = 1;
    return limits;
  }

  private getCompleteInputOptions(options?: ReweightImageOptions) {
    if(!options) options = {};
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
