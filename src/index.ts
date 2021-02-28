import { empty, Observable, Observer } from 'rxjs';
import { expand, flatMap, map } from 'rxjs/operators';

export class Reweight {

  /**
  * Compress an image by means of its size in pixels or in Mb or by means of
  * its jpeg compression
  * @param image The file to compress
  * @param limits An object with one or more of next properties: maxImageSize:
  * The maximum size in pixels for the returned image in its maximum dimensions
  * (x or y); jpegQuality: The maximum compreesion rate for the returned jpeg;
  * maxFileSizeMb: The maximum file size for the returned image; imageSizeRatio:
  * ratio to apply to reduce pixels dimensions in each iteration to reach file
  * size; jpegQualityRatio: ratio to apply to reduce jpeg compression in each
  * iteration to reach file size.
  * Values aren't changed if input image is already below limits. Any value not
  * specified means there's no limit for this property
  */
  static compressImage(image: File,
    limits?: {
        maxImageSize?: number,
        jpegQuality?: number,
        maxFileSizeMb?: number,
        imageSizeRatio?: number,
        jpegQualityRatio?: number
      }):
    Observable<File>
  {
    let maxFileSize = limits.maxFileSizeMb? limits.maxFileSizeMb*1000000 : undefined;
    if (limits.maxFileSizeMb && !limits.imageSizeRatio)
      limits.imageSizeRatio = 0.99;
    if (limits.maxFileSizeMb && !limits.jpegQualityRatio)
      limits.jpegQualityRatio = 0.99;
    let maxImageSize = limits.maxImageSize,
        jpegQuality = limits.jpegQuality;
    return this.getUrlFromBlob(image).pipe(
      flatMap((base64image)=>{
        return this._subCompressImage(base64image, maxImageSize, jpegQuality);
      }),
      expand((ret: {base64: string, blob: Blob})=> {
        if (ret.blob.size > maxFileSize) {
          maxImageSize *= limits.imageSizeRatio;
          jpegQuality *= limits.jpegQualityRatio;
          return this._subCompressImage(ret.base64, maxImageSize, jpegQuality)
        } else
          return empty();
      }),
      map(({blob}) => {
        // console.log(`size: ${blob.size/1000000}, dim: ${Math.round(maxImageSize)}, q: ${Math.round(jpegQuality*100)}`)
        return new File([blob], image.name, {type: 'image/jpeg'});
      })
    );
  }

  private _subCompressImage(base64image: string, maxImageSize: number, jpegQuality: number)
    : Observable<{base64: string, blob: Blob}>
  {
    return this.reduceImage64Size(base64image, maxImageSize, jpegQuality).pipe(
      map((reducedBase64image: string)=>{
        return {
          base64: reducedBase64image,
          blob: this.getBlobFromUrl(reducedBase64image)
        };
      }),
    );
  }

  /**
  * Compress an image by means of its size in pixels or in Mb or by means of
  * its jpeg compression.
  * @param image The file to compress
  * @param limits An object with one or more of next properties: maxImageSize:
  * The maximum size in pixels for the returned image in its maximum dimensions
  * (x or y); jpegQuality: The maximum compreesion rate for the returned jpeg.
  * Values aren't changed if input image is already below limits. Any value not
  * specified means there's no limit for this property
  */
  reduceImage64Size(image64: string, maxImageSize?: number, jpegQuality?: number):
    Observable<string>
  {
    // ************************** WHAT DOES IT HAPPEN when maxImageSize is null
    let imageElement: HTMLImageElement = this.renderer.createElement('img');
    return Observable.create((observer: Observer<string>)=>{
      imageElement.onload = () => {
          const {width: imgWidth, height: imgHeight} = imageElement;
          let  widthScale  = maxImageSize / imgWidth,
                heightScale = maxImageSize / imgHeight;
          let scale = Math.max(widthScale, heightScale);

          if (scale > 1) {
            maxImageSize = Math.min(imgWidth, imgHeight)
            scale = 1
          }

          const growthScale: number = Math.max(widthScale, heightScale) / Math.min(widthScale, heightScale);
          let   xScale: number,
                yScale: number;
          if (imageElement.width > imageElement.height) {
            xScale = growthScale;
            yScale = 1;
          } else {
            xScale = 1;
            yScale = growthScale;
          }

          const canvas: HTMLCanvasElement = this.renderer.createElement('canvas');
          canvas.width  = maxImageSize * xScale;
          canvas.height = maxImageSize * yScale;
          let context = canvas.getContext('2d');
          context.scale(scale, scale);
          context.drawImage(imageElement, 0, 0);
          let reducedImage = canvas.toDataURL('image/jpeg', jpegQuality);
          observer.next(reducedImage);
      }
      imageElement.src = image64;
    });
  }

  static getUrlFromBlob(image: Blob): Observable<string> {
    let reader = new FileReader();
    return Observable.create((observer: Observer<string|ArrayBuffer>)=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(res);
      }
      reader.readAsDataURL(image);
    });
  }

  // returned file is in jpeg format
  // From https://stackoverflow.com/questions/21227078/convert-base64-to-image-in-javascript-jquery
  // with litle modifications
  getBlobFromUrl(base64image: string): Blob {
    let head = base64image.indexOf('base64,');
    if (head !== -1)
      base64image = base64image.substr(head+7);
    let sliceSize = 1024,
        byteCharacters = atob(base64image),
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
