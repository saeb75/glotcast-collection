import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common"
import { refSchema } from "./catalog.dto"

/** A podcast / episode id in a path: a UUID or a legacy Strapi documentId (letters, digits, dashes). */
@Injectable()
export class RefPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const parsed = refSchema.safeParse(value)
    if (!parsed.success) throw new BadRequestException("not a valid id")
    return parsed.data
  }
}
