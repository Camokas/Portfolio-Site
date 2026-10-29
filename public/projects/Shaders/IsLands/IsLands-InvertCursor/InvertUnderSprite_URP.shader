Shader "Custom/InvertUnderSprite_URP_KeepAlpha"
{
    Properties
    {
        _MainTex("Sprite", 2D) = "white" {}
        _Color("Tint", Color) = (1,1,1,1)
        _InvertAmount("Invert Amount", Range(0,1)) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" }
        ZWrite Off
        Cull Off
        Blend SrcAlpha OneMinusSrcAlpha

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);
            float4 _Color;
            float  _InvertAmount;

            TEXTURE2D_X(_CameraOpaqueTexture);
            SAMPLER(sampler_CameraOpaqueTexture);

            struct Attributes {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 screenPos : TEXCOORD1;
            };

            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv;
                o.screenPos = ComputeScreenPos(o.positionCS);
                return o;
            }

            float4 frag (Varyings i) : SV_Target
            {
                float4 sprite = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv) * _Color;
                float2 uvScreen = i.screenPos.xy / i.screenPos.w;
                float4 bg = SAMPLE_TEXTURE2D_X(_CameraOpaqueTexture, sampler_CameraOpaqueTexture, uvScreen);
            
                // яркость фона
                float g = dot(bg.rgb, float3(0.2126, 0.7152, 0.0722));
            
                // бинарная инверсия — если яркость больше 0.5, делаем черным, иначе белым
                float3 invBg = (g > 0.5) ? float3(0, 0, 0) : float3(1, 1, 1);
            
                // интерполяция между оригинальным фоном и инвертированным (по альфе спрайта)
                float3 finalColor = lerp(bg.rgb, invBg, _InvertAmount * sprite.a);
            
                return float4(finalColor, sprite.a);
            }

            ENDHLSL
        }
    }
}
