# reweight-image

Resize file images in browser by limiting its **size in megabytes** (its 'weight'), its **size in pixels** or its **jpeg quality**.

File size is reduced by progressively resizing *image dimensions in pixels* and/or by progressively reducing *jpeg quality*, until output is under given limits. It means that consecutive steps will take the image and apply a factor to its size (starting from the input image dimensions or from the maximum specified size - the lower one) and/or to its jpeg quality (starting from the maximum specified quality or from 1 is none is specified).

## Install

```sh
npm i reweight --save
```

## Usage

Typical use is reduce a loaded image file size prior to upload it to server. You may want, also, showing the file in an HTML `<img>` element.
### Typescript
```typescript
import { ReweightImage, Convert } from 'reweight-image';

function reduceFile(image: File, imageElement: HTMLImageElement) {
  const reweight = new ReweightImage({fileSizeMb: 0.5}, {coverMaxImageSize: true}),
        convert = new Convert();
  reweight.compressImageFile(image).pipe(
    switchMap((reducedFile: File)=>{
      return convert.getBase64FromBlob(reducedFile);
    })
  ).subscribe({
    next: (base64image: string)=> {
      imageElement.src = base64image;
    }
  });
}
```

### new ReweightImage(limits, options)
Creates a 'reweighter' to resize an image. Options is optional.

`limits` can hold the next properties (all are optional):
- {number} fileSizeMb: maximum output file size, in megabytes
- {number} imageSizePx: maximum output image dimensions, in pixels
- {number} jpegQuality: output jpeg quality factor

File size and image size of the original file will be kept if passed values are bigger than the ones of original image. Jpeg quality will be 1 if omitted, as it is not read from original file.

`options` can hold the next properties (all are optional):
- {boolean} coverMaxImageSize: if true and `imageSizePx` is given in `limits`, output image size will adjust to completely cover an square of `imageSizePx`. Default is set to false.
- {number} imageSizeRatio: factor to apply in each
- {number} jpegQualityRatio: number

### [ReweightImage].compressImageFile(image)

Resizes an image.

Input must be a `File` object holding an image, usually taken from an `<input type="file">` element.  It will work with any valid image format, but it will not verify that input file is an actual valid image.

Returns an [RxJs](https://github.com/ReactiveX/rxjs) `observable`. Subscription will output a `File` object containing an image, according to parameters passed to `ReweightImage` constructor. Output file will hold, always, a **jpeg image**.

### [Convert].getBase64FromBlob(image)

Converts an image in *base64* format, a `string`, into a `Blob` object. Input must be a `Blob` object.

Returns an [RxJs](https://github.com/ReactiveX/rxjs) `observable`. Subscription will output a `string` which can be used as an image source for an HTML `<img>` tag.

### [Convert].getBlobFromBase64(image)

Converts a `Blob` into an image in *base64* format, a `string`.Input must be an image in base64 format, a `string`.

Returns the `Blob` object.
