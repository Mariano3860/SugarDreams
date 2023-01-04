import { useFrame, useLoader } from "@react-three/fiber"
import { MutableRefObject, useEffect, useRef } from "react"
import * as THREE from "three"

type AsepriteFrame = {
  frame: {
    x: number
    y: number
    w: number
    h: number
  }
  rotated: boolean
  trimmed: boolean
  spriteSourceSize: {
    x: number
    y: number
    w: number
    h: number
  }
  sourceSize: {
    w: number
    h: number
  }
  duration: number
}

type AsepriteLayer = {
  name: string
  opacity: number
  blendMode: string
}

type AsepriteFrameTag = { name: string; from: number; to: number; direction: "forward" | "backward" }

type AsepriteJson = {
  frames: { [name: string]: AsepriteFrame }
  meta: {
    app: string
    version: string
    image: string
    format: string
    size: {
      w: number
      h: number
    }
    frameTags: AsepriteFrameTag[]
    layers: AsepriteLayer[]
    slices: unknown[]
  }
}

function frameList(json: AsepriteJson): AsepriteFrame[] {
  return Object.values(json.frames)
}

function getAnimationFrames(json: AsepriteJson, name: string): AsepriteFrame[] {
  const tag = json.meta.frameTags.find((t) => t.name === name)
  if (!tag) return []

  const allFrames = frameList(json)
  return allFrames.slice(tag.from, tag.to)
}

export function useAseprite(src: string, json: AsepriteJson, currentAnimation: string | null = null, loop: boolean = true) {
  const texture: THREE.Texture = useLoader(THREE.TextureLoader, src)

  // We'll be animating these independently, clone the texture
  const tex = texture.clone()
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true

  const frames: MutableRefObject<AsepriteFrame[]> = useRef([])

  const w = json.meta.size.w
  const h = json.meta.size.h

  const t = useRef(0)
  const index = useRef(0)
  const playing = useRef(true)

  useEffect(() => {
    t.current = 0
    index.current = 0
    playing.current = true

    if (currentAnimation) {
      frames.current = getAnimationFrames(json, currentAnimation)
    } else {
      frames.current = frameList(json)
    }
  }, [currentAnimation, texture, json])

  useFrame((_, delta) => {
    if (playing.current) {
      t.current += delta * 1000
    }

    const f = frames.current[index.current]
    if (!f) return

    tex.repeat.set(f.frame.w / w, f.frame.h / h)

    if (t.current >= f.duration) {
      index.current += 1
      if (index.current >= frames.current.length) {
        if (loop) {
          index.current = 0
        } else {
          index.current -= 1
          playing.current = false
        }
      }

      t.current = 0

      tex.offset.x = f.frame.x / w
      tex.offset.y = f.frame.h / h
    }
  })

  return tex
}
