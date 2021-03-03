import { EMPTY, Observable } from 'rxjs';
import { expand, map, mergeMap } from 'rxjs/operators';
import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported
// https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
// Richie Bendall's solution
import { Convert } from './convert';

type Base64image = string;

export { Convert };

export class Reweight {

  // TODO: add functionality to reduce image size and jpeg quality
  compressImageFile(
                      fileImage: File,
                      limits: {
                        maxImageSize?: number,
                        coverMaxImageSize?: boolean,
                        jpegQuality?: number,
                        maxFileSizeMb?: number,
                        imageSizeRatio?: number,
                        jpegQualityRatio?: number
                      }
                    ) {
    let maxFileSize = limits.maxFileSizeMb? limits.maxFileSizeMb*1000000 : 10000000000000;
    if (limits.maxFileSizeMb && !limits.imageSizeRatio)
      limits.imageSizeRatio = 0.99;
    if (limits.maxFileSizeMb && !limits.jpegQualityRatio)
      limits.jpegQualityRatio = 0.99;
    let maxImageSize = limits.maxImageSize || 10000, //provisional
        jpegQuality = limits.jpegQuality || 1,
        imageSizeRatio = limits.imageSizeRatio || 0.99,
        jpegQualityRatio = limits.jpegQualityRatio? limits.jpegQualityRatio: 0.99;
    // TODO: refactor all these variables default values, by reviewing its actual meaning
    let convert = new Convert();
    return convert.getBase64FromBlob(fileImage).pipe(
      mergeMap((base64image: Base64image)=>{
          return this.compressBase64Image(base64image, maxImageSize, jpegQuality);
      }),
      expand((base64image: Base64image)=>{
        let blob = convert.getBlobFromBase64(base64image);
        if (blob.size > maxFileSize) {
          maxImageSize *= imageSizeRatio;
          jpegQuality *= jpegQualityRatio;
          return this.compressBase64Image(base64image, maxImageSize, jpegQuality);
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

  private compressBase64Image(
                                base64Image: string,
                                maxImageSize: number,
                                jpegQuality: number
                              ): Observable<Base64image> {
    return new Observable(observer=>{
      let imageElement: HTMLImageElement = document.createElement('img');
      imageElement.onload = () => {
        let resizedBase64Image: Base64image = this.resizeImageElement(imageElement, maxImageSize, jpegQuality);
        observer.next(resizedBase64Image);
      }
      imageElement.src = base64Image;
    });
  }

  private resizeImageElement(
                              imageElement: HTMLImageElement,
                              maxImageSize: number,
                              jpegQuality: number
                            ): Base64image {
    const {width: imgWidth, height: imgHeight} = imageElement;
    const {scale: scale, xScale: xScale, yScale: yScale} =
                                      this.getScales(maxImageSize, imgWidth, imgHeight, true);
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width  = xScale;
    canvas.height = yScale;
    let context: CanvasRenderingContext2D = <CanvasRenderingContext2D>(canvas.getContext('2d'));
    // type can be safely cast to CanvasRenderingContext2D as '2d' is a supported identifier
    context.scale(scale, scale);
    context.drawImage(imageElement, 0, 0);
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }

  private  getScales(maxImageSize: number, imgWidth: number, imgHeight: number, cover: boolean) {
    let referenceDimension =  cover
                              ? Math.min(imgWidth, imgHeight)
                              : Math.max(imgWidth, imgHeight);
    let scale = maxImageSize / referenceDimension;
    if (scale > 1)
      scale = 1;
    return {scale: scale, xScale: scale * imgWidth, yScale: scale * imgHeight};
  }

}
