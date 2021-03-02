import { EMPTY, Observable } from 'rxjs';
import { expand, map, mergeMap } from 'rxjs/operators';

import { atob } from 'abab';

import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported
// https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
// Richie Bendall's solution

type Base64image = string;

export class Reweight {

  // TODO: add functionality to reduce image size and jpeg quality
  compressImageFile(
                      fileImage: File,
                      limits: {
                        maxImageSize?: number,
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
    return this.getBase64FromBlob(fileImage).pipe(
      mergeMap((base64image: Base64image)=>{
          return this.compressBase64Image(base64image, maxImageSize, jpegQuality);
      }),
      expand((base64image: Base64image)=>{
        let blob = this.getBlobFromBase64(base64image);
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
        let blob = this.getBlobFromBase64(<Base64image>base64image);
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
                                      this.getScales(maxImageSize, imgWidth, imgHeight);
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width  = xScale;
    canvas.height = yScale;
    let context: CanvasRenderingContext2D = <CanvasRenderingContext2D>(canvas.getContext('2d'));
    // type can be safely cast to CanvasRenderingContext2D as '2d' is a supported identifier
    context.scale(scale, scale);
    context.drawImage(imageElement, 0, 0);
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }

  private  getScales(maxImageSize: number, imgWidth: number, imgHeight: number) {
    let widthScale  = maxImageSize / imgWidth,
        heightScale = maxImageSize / imgHeight;
    let scale = Math.max(widthScale, heightScale);

    if (scale > 1) {
      maxImageSize = Math.min(imgWidth, imgHeight)
      scale = 1
    }

    const growthScale: number = Math.max(widthScale, heightScale) / Math.min(widthScale, heightScale);
    let   xScale: number,
          yScale: number;

    if (imgWidth > imgHeight) {
      xScale = growthScale;
      yScale = 1;
    } else {
      xScale = 1;
      yScale = growthScale;
    }

    return {scale: scale, xScale: xScale * maxImageSize, yScale: yScale * maxImageSize};
  }


  getBase64FromBlob(image: Blob): Observable<Base64image> {
    let reader = new FileReader();
    return new Observable(observer=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(<Base64image>res);
        //res can be safely cast to string as we use readAsDataURL method
      }
      reader.readAsDataURL(image);
    });
  }


  // returned file is in jpeg format
  // From https://stackoverflow.com/questions/21227078/convert-base64-to-image-in-javascript-jquery
  // with litle modifications
  getBlobFromBase64(base64image: Base64image): Blob {
    let head = base64image.indexOf('base64,');
    if (head !== -1)
      base64image = base64image.substr(head+7);
    let sliceSize = 1024,
        byteCharacters = <Base64image>atob(base64image),
        // type can be safely cast to Base64image unless base64image is also null
        bytesLength = byteCharacters.length,
        slicesCount = Math.ceil(bytesLength / sliceSize),
        byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        let begin = sliceIndex * sliceSize,
            end = Math.min(begin + sliceSize, bytesLength),

            bytes = new Array(end - begin);
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    let blob = new Blob(byteArrays, { type: 'image/jpeg' });
    return blob;
  }
}
